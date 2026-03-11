import { createPlanUpdateReminderHook } from "../../../hooks/plan-update-reminder"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "plan-update-reminder",
  lifecycle: ["tool.execute.before", "tool.execute.after", "event"],
  factory: createPlanUpdateReminderHook,
}
