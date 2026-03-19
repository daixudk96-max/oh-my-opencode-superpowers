import { log } from "../shared/logger";
import { resolveCompactionModel } from "./shared/compaction-model-resolver";
const DEFAULT_ACTUAL_LIMIT = 200_000;
const PREEMPTIVE_COMPACTION_TIMEOUT_MS = 120_000;
function getAnthropicActualLimit(modelCacheState) {
    return (modelCacheState?.anthropicContext1MEnabled ?? false) ||
        process.env.ANTHROPIC_1M_CONTEXT === "true" ||
        process.env.VERTEX_ANTHROPIC_1M_CONTEXT === "true"
        ? 1_000_000
        : DEFAULT_ACTUAL_LIMIT;
}
const PREEMPTIVE_COMPACTION_THRESHOLD = 0.78;
function withTimeout(promise, timeoutMs, errorMessage) {
    let timeoutID;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutID = setTimeout(() => {
            reject(new Error(errorMessage));
        }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timeoutID !== undefined) {
            clearTimeout(timeoutID);
        }
    });
}
function isAnthropicProvider(providerID) {
    return providerID === "anthropic" || providerID === "google-vertex-anthropic";
}
export function createPreemptiveCompactionHook(ctx, pluginConfig, modelCacheState) {
    const compactionInProgress = new Set();
    const compactedSessions = new Set();
    const tokenCache = new Map();
    const toolExecuteAfter = async (input, _output) => {
        const { sessionID } = input;
        if (compactedSessions.has(sessionID) || compactionInProgress.has(sessionID))
            return;
        const cached = tokenCache.get(sessionID);
        if (!cached)
            return;
        const modelSpecificLimit = !isAnthropicProvider(cached.providerID)
            ? modelCacheState?.modelContextLimitsCache?.get(`${cached.providerID}/${cached.modelID}`)
            : undefined;
        const actualLimit = isAnthropicProvider(cached.providerID)
            ? getAnthropicActualLimit(modelCacheState)
            : modelSpecificLimit ?? DEFAULT_ACTUAL_LIMIT;
        const lastTokens = cached.tokens;
        const totalInputTokens = (lastTokens?.input ?? 0) + (lastTokens?.cache?.read ?? 0);
        const usageRatio = totalInputTokens / actualLimit;
        if (usageRatio < PREEMPTIVE_COMPACTION_THRESHOLD)
            return;
        const modelID = cached.modelID;
        if (!modelID)
            return;
        compactionInProgress.add(sessionID);
        try {
            const { providerID: targetProviderID, modelID: targetModelID } = resolveCompactionModel(pluginConfig, sessionID, cached.providerID, modelID);
            await withTimeout(ctx.client.session.summarize({
                path: { id: sessionID },
                body: { providerID: targetProviderID, modelID: targetModelID, auto: true },
                query: { directory: ctx.directory },
            }), PREEMPTIVE_COMPACTION_TIMEOUT_MS, `Compaction summarize timed out after ${PREEMPTIVE_COMPACTION_TIMEOUT_MS}ms`);
            compactedSessions.add(sessionID);
        }
        catch (error) {
            log("[preemptive-compaction] Compaction failed", { sessionID, error: String(error) });
        }
        finally {
            compactionInProgress.delete(sessionID);
        }
    };
    const eventHandler = async ({ event }) => {
        const props = event.properties;
        if (event.type === "session.deleted") {
            const sessionInfo = props?.info;
            if (sessionInfo?.id) {
                compactionInProgress.delete(sessionInfo.id);
                compactedSessions.delete(sessionInfo.id);
                tokenCache.delete(sessionInfo.id);
            }
            return;
        }
        if (event.type === "message.updated") {
            const info = props?.info;
            if (!info || info.role !== "assistant" || !info.finish)
                return;
            if (!info.sessionID || !info.providerID || !info.tokens)
                return;
            tokenCache.set(info.sessionID, {
                providerID: info.providerID,
                modelID: info.modelID ?? "",
                tokens: info.tokens,
            });
            compactedSessions.delete(info.sessionID);
        }
    };
    return {
        "tool.execute.after": toolExecuteAfter,
        event: eventHandler,
    };
}
