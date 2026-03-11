import type { HookManifest } from "../../types"
import { createPlanningFlowGuideHook } from "../../../hooks/planning-flow-guide"

export const manifest: HookManifest = {
  name: "planning-flow-guide",
  lifecycle: ["tool.execute.after"],
  factory: createPlanningFlowGuideHook,
}
