import { createPlanReorganizerHook } from "../../../hooks/plan-reorganizer";
export const manifest = {
    name: "plan-reorganizer",
    lifecycle: ["tool.execute.before", "tool.execute.after"],
    factory: createPlanReorganizerHook,
};
