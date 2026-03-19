import { createBehaviorAnchorHook } from "../../../hooks/behavior-anchor";
export const manifest = {
    name: "behavior-anchor",
    lifecycle: ["tool.execute.after"],
    factory: createBehaviorAnchorHook,
};
