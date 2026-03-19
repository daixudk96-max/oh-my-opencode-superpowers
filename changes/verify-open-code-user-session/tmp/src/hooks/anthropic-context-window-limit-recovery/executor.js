import { TRUNCATE_CONFIG } from "./types";
import { getOrCreateTruncateState } from "./state";
import { runAggressiveTruncationStrategy, runSummarizeRetryStrategy, } from "./recovery-strategy";
export { getLastAssistant } from "./message-builder";
export async function executeCompact(sessionID, msg, autoCompactState, client, directory, pluginConfig, _experimental) {
    void _experimental;
    if (autoCompactState.compactionInProgress.has(sessionID)) {
        await client.tui
            .showToast({
            body: {
                title: "Compact In Progress",
                message: "Recovery already running. Please wait or start new session if stuck.",
                variant: "warning",
                duration: 5000,
            },
        })
            .catch(() => { });
        return;
    }
    autoCompactState.compactionInProgress.add(sessionID);
    try {
        const errorData = autoCompactState.errorDataBySession.get(sessionID);
        const truncateState = getOrCreateTruncateState(autoCompactState, sessionID);
        const isOverLimit = errorData?.currentTokens &&
            errorData?.maxTokens &&
            errorData.currentTokens > errorData.maxTokens;
        // Aggressive Truncation - always try when over limit
        if (isOverLimit &&
            truncateState.truncateAttempt < TRUNCATE_CONFIG.maxTruncateAttempts) {
            const result = await runAggressiveTruncationStrategy({
                sessionID,
                autoCompactState,
                client: client,
                directory,
                truncateAttempt: truncateState.truncateAttempt,
                currentTokens: errorData.currentTokens,
                maxTokens: errorData.maxTokens,
            });
            truncateState.truncateAttempt = result.nextTruncateAttempt;
            if (result.handled)
                return;
        }
        await runSummarizeRetryStrategy({
            sessionID,
            msg,
            autoCompactState,
            client: client,
            directory,
            pluginConfig,
            errorType: errorData?.errorType,
            messageIndex: errorData?.messageIndex,
        });
    }
    finally {
        autoCompactState.compactionInProgress.delete(sessionID);
    }
}
