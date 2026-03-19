import { createMdselReminderHook } from "../../../hooks/mdsel-reminder";
export const manifest = {
    name: "mdsel-reminder",
    lifecycle: ["tool.execute.before", "tool.execute.after"],
    factory: createMdselReminderHook,
};
