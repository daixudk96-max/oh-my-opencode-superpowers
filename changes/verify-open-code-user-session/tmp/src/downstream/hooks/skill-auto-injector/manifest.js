import { createSkillAutoInjectorHook } from "../../../hooks/skill-auto-injector";
export const manifest = {
    name: "skill-auto-injector",
    lifecycle: ["chat.message", "event"],
    factory: createSkillAutoInjectorHook,
};
