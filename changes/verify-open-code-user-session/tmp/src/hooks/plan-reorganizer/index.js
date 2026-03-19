/**
 * Plan Reorganizer Hook
 *
 * PostToolUse hook that triggers plan reorganization after Edit/Write to tasks.md.
 * Moves completed phases to the bottom of the document.
 * Integrates phase-rollback for failure analysis and recovery suggestions.
 *
 * // TDD-EXEMPT
 */
import { reorganizePlan } from "../../features/plan-reorganizer";
import { log } from "../../shared/logger";
import { createPhaseRollback, } from "../../shared/phase-rollback";
const HOOK_NAME = "plan-reorganizer";
/** File patterns that trigger reorganization */
const PLAN_FILE_PATTERNS = [
    /[/\\]tasks\.md$/i,
    /[/\\]task_plan\.md$/i,
];
/** Store filePath from tool.execute.before for use in tool.execute.after */
const pendingFilePaths = new Map();
/**
 * Check if a file path matches plan file patterns
 */
function isPlanFile(filePath) {
    return PLAN_FILE_PATTERNS.some(pattern => pattern.test(filePath));
}
export function createPlanReorganizerHook(ctx) {
    // Initialize phase rollback manager at verification phase (plan reorganization is a verification step)
    const phaseRollback = createPhaseRollback("verification");
    return {
        name: HOOK_NAME,
        /**
         * Get the rollback history for debugging purposes
         */
        getRollbackHistory() {
            return phaseRollback.getHistory();
        },
        /**
         * Clear the rollback history
         */
        clearRollbackHistory() {
            phaseRollback.clearHistory();
        },
        /**
         * Capture filePath in tool.execute.before (where output.args is available)
         * // TDD-EXEMPT: reason="Refactoring integration to standard tool hooks"
         */
        "tool.execute.before": async (input, output) => {
            const toolName = input.tool.toLowerCase();
            // Only capture for Edit or Write tools
            if (toolName !== "edit" && toolName !== "write") {
                return;
            }
            // Get file path from args
            const filePath = (output.args?.filePath ?? output.args?.file_path ?? output.args?.path);
            if (filePath && input.callID) {
                pendingFilePaths.set(input.callID, filePath);
            }
        },
        "tool.execute.after": async (input, output) => {
            const toolName = input.tool.toLowerCase();
            // Only trigger on Edit or Write tools
            if (toolName !== "edit" && toolName !== "write") {
                return;
            }
            // Get filePath from pendingFilePaths (captured in tool.execute.before)
            const filePath = input.callID ? pendingFilePaths.get(input.callID) : undefined;
            // Clean up pending entry
            if (input.callID) {
                pendingFilePaths.delete(input.callID);
            }
            if (!filePath) {
                return;
            }
            // Check if this is a plan file
            if (!isPlanFile(filePath)) {
                return;
            }
            // Reorganize the plan (silently, don't block)
            try {
                const changed = reorganizePlan(filePath);
                if (changed) {
                    log(`[${HOOK_NAME}] Reorganized plan file`, { filePath });
                }
            }
            catch (err) {
                const errorMessage = String(err);
                log(`[${HOOK_NAME}] Failed to reorganize plan`, { filePath, error: errorMessage });
                // Use phase-rollback to analyze the failure
                const failureReason = phaseRollback.extractFailureReason(errorMessage);
                const suggestedPhase = phaseRollback.suggestRollbackPhase(failureReason);
                // Record the rollback for debugging
                phaseRollback.rollbackTo(suggestedPhase, errorMessage);
                log(`[${HOOK_NAME}] Phase rollback suggested`, {
                    filePath,
                    failurePhase: failureReason.phase,
                    suggestedRollbackTo: suggestedPhase,
                });
            }
        },
        async handler({ event }) {
            if (event.type !== "tool.execute.after") {
                return;
            }
            const props = event.properties;
            if (!props)
                return;
            const toolName = props.tool;
            const filePath = props.input?.filePath || props.input?.path;
            if (toolName && filePath) {
                const callID = "legacy-handler-call";
                // Use standard structure internally
                await this["tool.execute.before"]({ tool: toolName, callID }, { args: { filePath } });
                await this["tool.execute.after"]({ tool: toolName, callID }, { output: props.output });
            }
        },
    };
}
