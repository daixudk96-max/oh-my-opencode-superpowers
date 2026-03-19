import { createInstinctTriggerHook } from "../../../hooks/instinct-trigger";
export const manifest = {
    name: "instinct-trigger",
    lifecycle: ["tool.execute.before"],
    factory: createInstinctTriggerHook,
};
