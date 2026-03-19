import { parseAnthropicTokenLimitError } from "./parser";
import { executeCompact, getLastAssistant } from "./executor";
import { attemptDeduplicationRecovery } from "./deduplication-recovery";
import { log } from "../../shared/logger";
function createRecoveryState() {
    return {
        pendingCompact: new Set(),
        errorDataBySession: new Map(),
        retryStateBySession: new Map(),
        truncateStateBySession: new Map(),
        emptyContentAttemptBySession: new Map(),
        compactionInProgress: new Set(),
    };
}
export function createAnthropicContextWindowLimitRecoveryHook(ctx, options) {
    const autoCompactState = createRecoveryState();
    const experimental = options?.experimental;
    const pluginConfig = options?.pluginConfig;
    const pendingCompactionTimeoutBySession = new Map();
    const eventHandler = async ({ event }) => {
        const props = event.properties;
        if (event.type === "session.deleted") {
            const sessionInfo = props?.info;
            if (sessionInfo?.id) {
                const timeoutID = pendingCompactionTimeoutBySession.get(sessionInfo.id);
                if (timeoutID !== undefined) {
                    clearTimeout(timeoutID);
                    pendingCompactionTimeoutBySession.delete(sessionInfo.id);
                }
                autoCompactState.pendingCompact.delete(sessionInfo.id);
                autoCompactState.errorDataBySession.delete(sessionInfo.id);
                autoCompactState.retryStateBySession.delete(sessionInfo.id);
                autoCompactState.truncateStateBySession.delete(sessionInfo.id);
                autoCompactState.emptyContentAttemptBySession.delete(sessionInfo.id);
                autoCompactState.compactionInProgress.delete(sessionInfo.id);
            }
            return;
        }
        if (event.type === "session.error") {
            const sessionID = props?.sessionID;
            log("[auto-compact] session.error received", { sessionID, error: props?.error });
            if (!sessionID)
                return;
            const parsed = parseAnthropicTokenLimitError(props?.error);
            log("[auto-compact] parsed result", { parsed, hasError: !!props?.error });
            if (parsed) {
                autoCompactState.pendingCompact.add(sessionID);
                autoCompactState.errorDataBySession.set(sessionID, parsed);
                if (autoCompactState.compactionInProgress.has(sessionID)) {
                    await attemptDeduplicationRecovery(sessionID, parsed, experimental, ctx.client);
                    return;
                }
                const lastAssistant = await getLastAssistant(sessionID, ctx.client, ctx.directory);
                const providerID = parsed.providerID ?? lastAssistant?.providerID;
                const modelID = parsed.modelID ?? lastAssistant?.modelID;
                await ctx.client.tui
                    .showToast({
                    body: {
                        title: "Context Limit Hit",
                        message: "Truncating large tool outputs and recovering...",
                        variant: "warning",
                        duration: 3000,
                    },
                })
                    .catch(() => { });
                const timeoutID = setTimeout(() => {
                    pendingCompactionTimeoutBySession.delete(sessionID);
                    executeCompact(sessionID, { providerID, modelID }, autoCompactState, ctx.client, ctx.directory, pluginConfig, experimental);
                }, 300);
                pendingCompactionTimeoutBySession.set(sessionID, timeoutID);
            }
            return;
        }
        if (event.type === "message.updated") {
            const info = props?.info;
            const sessionID = info?.sessionID;
            if (sessionID && info?.role === "assistant" && info.error) {
                log("[auto-compact] message.updated with error", { sessionID, error: info.error });
                const parsed = parseAnthropicTokenLimitError(info.error);
                log("[auto-compact] message.updated parsed result", { parsed });
                if (parsed) {
                    parsed.providerID = info.providerID;
                    parsed.modelID = info.modelID;
                    autoCompactState.pendingCompact.add(sessionID);
                    autoCompactState.errorDataBySession.set(sessionID, parsed);
                }
            }
            return;
        }
        if (event.type === "session.idle") {
            const sessionID = props?.sessionID;
            if (!sessionID)
                return;
            if (!autoCompactState.pendingCompact.has(sessionID))
                return;
            const timeoutID = pendingCompactionTimeoutBySession.get(sessionID);
            if (timeoutID !== undefined) {
                clearTimeout(timeoutID);
                pendingCompactionTimeoutBySession.delete(sessionID);
            }
            const errorData = autoCompactState.errorDataBySession.get(sessionID);
            const lastAssistant = await getLastAssistant(sessionID, ctx.client, ctx.directory);
            if (lastAssistant?.summary === true) {
                autoCompactState.pendingCompact.delete(sessionID);
                return;
            }
            const providerID = errorData?.providerID ?? lastAssistant?.providerID;
            const modelID = errorData?.modelID ?? lastAssistant?.modelID;
            await ctx.client.tui
                .showToast({
                body: {
                    title: "Auto Compact",
                    message: "Token limit exceeded. Attempting recovery...",
                    variant: "warning",
                    duration: 3000,
                },
            })
                .catch(() => { });
            await executeCompact(sessionID, { providerID, modelID }, autoCompactState, ctx.client, ctx.directory, pluginConfig, experimental);
        }
    };
    return {
        event: eventHandler,
    };
}
