import { createObservationRecorderHook } from "../../../hooks/observation-recorder"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "observation-recorder",
  lifecycle: ["tool.execute.before", "tool.execute.after"],
  factory: createObservationRecorderHook,
}
