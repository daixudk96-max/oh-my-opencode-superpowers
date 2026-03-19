import { createSkillAutoTriggerHook } from "../../../hooks/skill-auto-trigger";
export const manifest = {
    name: "skill-auto-trigger",
    lifecycle: ["chat.message"],
    factory: createSkillAutoTriggerHook,
};
