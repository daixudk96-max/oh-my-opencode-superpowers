import { buildRetryGuidance } from "./guidance";
import { detectDelegateTaskError } from "./patterns";
export function createDelegateTaskRetryHook(_ctx) {
    return {
        "tool.execute.after": async (input, output) => {
            if (input.tool.toLowerCase() !== "task")
                return;
            if (typeof output.output !== "string")
                return;
            const errorInfo = detectDelegateTaskError(output.output);
            if (errorInfo) {
                const guidance = buildRetryGuidance(errorInfo);
                output.output += `\n${guidance}`;
            }
        },
    };
}
