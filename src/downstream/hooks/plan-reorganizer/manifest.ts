import { createPlanReorganizerHook } from "../../../hooks/plan-reorganizer"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "plan-reorganizer",
  lifecycle: ["tool.execute.before", "tool.execute.after"],
  factory: createPlanReorganizerHook,
}
