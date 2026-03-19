import { createPlanningFlowGuideHook } from "../../../hooks/planning-flow-guide";
export const manifest = {
    name: "planning-flow-guide",
    lifecycle: ["tool.execute.after"],
    factory: createPlanningFlowGuideHook,
};
