import { createSkillAutoTriggerHook } from "../../../hooks/skill-auto-trigger"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "skill-auto-trigger",
  lifecycle: ["chat.message"],
  factory: createSkillAutoTriggerHook,
}
