import { createSkillSuggestionHook } from "../../../hooks/skill-suggestion";
export const manifest = {
    name: "skill-suggestion",
    lifecycle: ["chat.message"],
    factory: createSkillSuggestionHook,
};
