import { createSkillAutoInjectorHook } from "../../../hooks/skill-auto-injector"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "skill-auto-injector",
  lifecycle: ["chat.message", "event"],
  factory: createSkillAutoInjectorHook,
}
