import { createObservationWriteGuardHook } from "../../../hooks/observation-write-guard"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "observation-write-guard",
  lifecycle: ["tool.execute.before"],
  factory: createObservationWriteGuardHook,
}
