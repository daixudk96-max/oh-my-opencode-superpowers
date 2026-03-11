import { createAgentSkillReminderHook } from "../../../hooks/agent-skill-reminder"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "agent-skill-reminder",
  lifecycle: ["chat.message", "event"],
  factory: createAgentSkillReminderHook,
}
