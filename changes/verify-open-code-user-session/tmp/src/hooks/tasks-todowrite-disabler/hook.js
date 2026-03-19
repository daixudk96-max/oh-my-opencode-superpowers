import { BLOCKED_TOOLS, REPLACEMENT_MESSAGE } from "./constants";
export function createTasksTodowriteDisablerHook(config) {
    const isTaskSystemEnabled = config.experimental?.task_system ?? false;
    return {
        "tool.execute.before": async (input, _output) => {
            if (!isTaskSystemEnabled) {
                return;
            }
            const toolName = input.tool;
            if (BLOCKED_TOOLS.some((blocked) => blocked.toLowerCase() === toolName.toLowerCase())) {
                throw new Error(REPLACEMENT_MESSAGE);
            }
        },
    };
}
