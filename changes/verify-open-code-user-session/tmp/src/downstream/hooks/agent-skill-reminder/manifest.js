import { createAgentSkillReminderHook } from "../../../hooks/agent-skill-reminder";
export const manifest = {
    name: "agent-skill-reminder",
    lifecycle: ["chat.message", "event"],
    factory: createAgentSkillReminderHook,
};
