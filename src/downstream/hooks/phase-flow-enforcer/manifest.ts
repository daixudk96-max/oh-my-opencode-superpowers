import type { HookManifest } from "../../types"
import { createPhaseFlowEnforcerHook } from "../../../hooks/phase-flow-enforcer"

export const manifest: HookManifest = {
  name: "phase-flow-enforcer",
  lifecycle: ["tool.execute.after"],
  factory: createPhaseFlowEnforcerHook,
}
