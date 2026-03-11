import type { HookManifest } from "../../types"
import { createSkillSuggestionHook } from "../../../hooks/skill-suggestion"

export const manifest: HookManifest = {
  name: "skill-suggestion",
  lifecycle: ["chat.message"],
  factory: createSkillSuggestionHook,
}
