// TDD-EXEMPT: reason="Path migration to changes/"
import { AnomalyDetector } from "./detector";
import { log } from "../../shared/logger";
// Deduplication: track last warning per session to avoid spam
const lastWarnings = new Map();
const DEDUP_WINDOW_MS = 30000; // 30 seconds
function shouldShowWarning(sessionId, message) {
    const now = Date.now();
    const last = lastWarnings.get(sessionId);
    if (last && last.message === message && (now - last.timestamp) < DEDUP_WINDOW_MS) {
        return false; // Duplicate within window, skip
    }
    lastWarnings.set(sessionId, { message, timestamp: now });
    return true;
}
export function createObserverDetectorHook(options = {}) {
    const detector = new AnomalyDetector();
    const { delegateTask } = options;
    return {
        "tool.execute.after": async (input, output) => {
            try {
                // Detect if this call was a failure
                const isFailure = detector.detectFailure(input.sessionID, output.output);
                // Record the tool call for history tracking
                detector.recordToolCall(input.sessionID, input.tool, !isFailure);
                // Detect loop pattern
                const loopWarning = detector.detectLoop(input.sessionID, input.tool);
                if (loopWarning && shouldShowWarning(input.sessionID, loopWarning)) {
                    log(loopWarning, { sessionID: input.sessionID });
                }
                // Track consecutive failures
                const failureWarning = detector.trackFailure(input.sessionID, isFailure);
                if (failureWarning && shouldShowWarning(input.sessionID, failureWarning)) {
                    log(failureWarning, { sessionID: input.sessionID });
                }
                // Increment call counter and check for L2 trigger
                const { shouldTriggerL2, message } = detector.incrementCallCounter(input.sessionID);
                if (message && shouldShowWarning(input.sessionID, message)) {
                    log(message, { sessionID: input.sessionID });
                }
                // Trigger L2 analysis if threshold reached
                if (shouldTriggerL2 && delegateTask) {
                    const summary = detector.getRecentCallsSummary(input.sessionID);
                    // Fire and forget - don't block on L2 analysis
                    delegateTask({
                        subagent_type: "observer",
                        run_in_background: true,
                        prompt: `Analyze the last 20 tool calls for patterns, anomalies, or inefficiencies.\n\n${summary}\n\nLook for:\n- Repeated tool calls that might indicate loops\n- Failure patterns that suggest issues\n- Opportunities to optimize tool usage\n\nREQUIRED ACTION:\nIf you find actionable insights, you MUST use the 'write' tool to append them to:\n'changes/observations.md'\n\nFormat:\n## Observation [YYYY-MM-DD HH:mm]\n- **Pattern**: [Description]\n- **Recommendation**: [Actionable advice]`,
                    }).catch((err) => {
                        log(`[observer-detector] L2 analysis dispatch failed: ${err instanceof Error ? err.message : String(err)}`, { sessionID: input.sessionID });
                    });
                }
            }
            catch (err) {
                // Silent fail - don't block execution
                log(`[observer-detector] Error during detection: ${err instanceof Error ? err.message : String(err)}`, { sessionID: input.sessionID });
            }
        },
        event: async (event) => {
            try {
                if (event.event === "session.deleted" && event.sessionID) {
                    detector.cleanup(event.sessionID);
                    lastWarnings.delete(event.sessionID); // Clean up dedup state
                }
            }
            catch (err) {
                // Silent fail
                log(`[observer-detector] Error during cleanup: ${err instanceof Error ? err.message : String(err)}`, { sessionID: event.sessionID });
            }
        },
    };
}
