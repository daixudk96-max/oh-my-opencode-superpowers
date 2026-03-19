import { isCallerOrchestrator } from "../../shared/session-utils";
import { SYSTEM_DIRECTIVE_PREFIX } from "../../shared/system-directive";
import { log } from "../../shared/logger";
import { HOOK_NAME, NOTEPAD_DIRECTIVE } from "./constants";
export function createSisyphusJuniorNotepadHook(ctx) {
    return {
        "tool.execute.before": async (input, output) => {
            // 1. Check if tool is task
            if (input.tool !== "task") {
                return;
            }
            // 2. Check if caller is Atlas (orchestrator)
            if (!(await isCallerOrchestrator(input.sessionID, ctx.client))) {
                return;
            }
            // 3. Get prompt from output.args
            const prompt = output.args.prompt;
            if (!prompt) {
                return;
            }
            // 4. Check for double injection
            if (prompt.includes(SYSTEM_DIRECTIVE_PREFIX)) {
                return;
            }
            // 5. Prepend directive
            output.args.prompt = NOTEPAD_DIRECTIVE + prompt;
            // 6. Log injection
            log(`[${HOOK_NAME}] Injected notepad directive to task`, {
                sessionID: input.sessionID,
            });
        },
    };
}
