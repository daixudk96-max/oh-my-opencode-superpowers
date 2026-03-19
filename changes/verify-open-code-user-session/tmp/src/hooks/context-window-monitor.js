import { createSystemDirective, SystemDirectiveTypes } from "../shared/system-directive";
const ANTHROPIC_DISPLAY_LIMIT = 1_000_000;
const DEFAULT_ANTHROPIC_ACTUAL_LIMIT = 200_000;
const CONTEXT_WARNING_THRESHOLD = 0.70;
function getAnthropicActualLimit(modelCacheState) {
    return (modelCacheState?.anthropicContext1MEnabled ?? false) ||
        process.env.ANTHROPIC_1M_CONTEXT === "true" ||
        process.env.VERTEX_ANTHROPIC_1M_CONTEXT === "true"
        ? 1_000_000
        : DEFAULT_ANTHROPIC_ACTUAL_LIMIT;
}
const CONTEXT_REMINDER = `${createSystemDirective(SystemDirectiveTypes.CONTEXT_WINDOW_MONITOR)}

You are using Anthropic Claude with 1M context window.
You have plenty of context remaining - do NOT rush or skip tasks.
Complete your work thoroughly and methodically.`;
function isAnthropicProvider(providerID) {
    return providerID === "anthropic" || providerID === "google-vertex-anthropic";
}
export function createContextWindowMonitorHook(_ctx, modelCacheState) {
    const remindedSessions = new Set();
    const tokenCache = new Map();
    const toolExecuteAfter = async (input, output) => {
        const { sessionID } = input;
        if (remindedSessions.has(sessionID))
            return;
        const cached = tokenCache.get(sessionID);
        if (!cached)
            return;
        if (!isAnthropicProvider(cached.providerID))
            return;
        const lastTokens = cached.tokens;
        const totalInputTokens = (lastTokens?.input ?? 0) + (lastTokens?.cache?.read ?? 0);
        const actualUsagePercentage = totalInputTokens / getAnthropicActualLimit(modelCacheState);
        if (actualUsagePercentage < CONTEXT_WARNING_THRESHOLD)
            return;
        remindedSessions.add(sessionID);
        const displayUsagePercentage = totalInputTokens / ANTHROPIC_DISPLAY_LIMIT;
        const usedPct = (displayUsagePercentage * 100).toFixed(1);
        const remainingPct = ((1 - displayUsagePercentage) * 100).toFixed(1);
        const usedTokens = totalInputTokens.toLocaleString();
        const limitTokens = ANTHROPIC_DISPLAY_LIMIT.toLocaleString();
        output.output += `\n\n${CONTEXT_REMINDER}
[Context Status: ${usedPct}% used (${usedTokens}/${limitTokens} tokens), ${remainingPct}% remaining]`;
    };
    const eventHandler = async ({ event }) => {
        const props = event.properties;
        if (event.type === "session.deleted") {
            const sessionInfo = props?.info;
            if (sessionInfo?.id) {
                remindedSessions.delete(sessionInfo.id);
                tokenCache.delete(sessionInfo.id);
            }
        }
        if (event.type === "message.updated") {
            const info = props?.info;
            if (!info || info.role !== "assistant" || !info.finish)
                return;
            if (!info.sessionID || !info.providerID || !info.tokens)
                return;
            tokenCache.set(info.sessionID, {
                providerID: info.providerID,
                tokens: info.tokens,
            });
        }
    };
    return {
        "tool.execute.after": toolExecuteAfter,
        event: eventHandler,
    };
}
