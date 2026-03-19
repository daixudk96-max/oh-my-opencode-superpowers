import { createPlanUpdateReminderHook } from "../../../hooks/plan-update-reminder";
export const manifest = {
    name: "plan-update-reminder",
    lifecycle: ["tool.execute.before", "tool.execute.after", "event"],
    factory: createPlanUpdateReminderHook,
};
