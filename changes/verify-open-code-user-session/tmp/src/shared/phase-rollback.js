/**
 * Phase Rollback - 动态阶段回溯机制
 *
 * 自动提取验证失败的具体原因，根据失败原因重组任务。
 */
const DEFAULT_CONFIG = {
    maxHistorySize: 20,
};
/**
 * Creates a phase rollback manager.
 */
export function createPhaseRollback(currentPhase, config = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    let phase = currentPhase;
    const history = [];
    function extractFailureReason(errorMessage) {
        const lowerMessage = errorMessage.toLowerCase();
        // Detect phase from error message
        let detectedPhase = phase;
        if (lowerMessage.includes("type error") ||
            lowerMessage.includes("compile") ||
            lowerMessage.includes("build failed")) {
            detectedPhase = "implementation";
        }
        else if (lowerMessage.includes("test failed") ||
            lowerMessage.includes("assertion") ||
            lowerMessage.includes("expect")) {
            detectedPhase = "verification";
        }
        else if (lowerMessage.includes("design") ||
            lowerMessage.includes("architecture") ||
            lowerMessage.includes("requirement")) {
            detectedPhase = "planning";
        }
        else if (lowerMessage.includes("review") ||
            lowerMessage.includes("lint") ||
            lowerMessage.includes("code quality")) {
            detectedPhase = "review";
        }
        return {
            phase: detectedPhase,
            reason: errorMessage,
            timestamp: new Date(),
        };
    }
    function suggestRollbackPhase(failure) {
        // Suggest rolling back to one phase before the failure
        const phaseOrder = ["planning", "implementation", "review", "verification"];
        const failureIndex = phaseOrder.indexOf(failure.phase);
        if (failureIndex <= 0) {
            return "planning";
        }
        return phaseOrder[failureIndex - 1];
    }
    function rollbackTo(targetPhase, reason) {
        const rollback = {
            from: phase,
            to: targetPhase,
            reason,
            timestamp: new Date(),
        };
        history.push(rollback);
        // Trim history if exceeds max size
        while (history.length > mergedConfig.maxHistorySize) {
            history.shift();
        }
        phase = targetPhase;
        return rollback;
    }
    function getHistory() {
        return [...history];
    }
    function clearHistory() {
        history.length = 0;
    }
    return {
        extractFailureReason,
        suggestRollbackPhase,
        rollbackTo,
        getHistory,
        clearHistory,
    };
}
