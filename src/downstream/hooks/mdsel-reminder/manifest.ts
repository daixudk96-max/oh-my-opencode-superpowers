import { createMdselReminderHook } from "../../../hooks/mdsel-reminder"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "mdsel-reminder",
  lifecycle: ["tool.execute.before", "tool.execute.after"],
  factory: createMdselReminderHook,
}
