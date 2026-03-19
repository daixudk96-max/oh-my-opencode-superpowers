import { createFailureCounterHook } from "../../../hooks/failure-counter";
export const manifest = {
    name: "failure-counter",
    lifecycle: ["tool.execute.before", "tool.execute.after", "UserPromptSubmit"],
    factory: createFailureCounterHook,
};
