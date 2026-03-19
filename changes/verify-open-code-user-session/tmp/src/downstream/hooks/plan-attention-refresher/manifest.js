import { createPlanAttentionRefresherHook } from "../../../hooks/plan-attention-refresher";
export const manifest = {
    name: "plan-attention-refresher",
    lifecycle: ["tool.execute.before"],
    factory: createPlanAttentionRefresherHook,
};
