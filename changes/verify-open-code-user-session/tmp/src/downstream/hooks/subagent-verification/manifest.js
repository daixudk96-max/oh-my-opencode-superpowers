import { createSubagentVerificationHook } from "../../../hooks/subagent-verification";
export const manifest = {
    name: "subagent-verification",
    lifecycle: ["tool.execute.after"],
    factory: createSubagentVerificationHook,
};
