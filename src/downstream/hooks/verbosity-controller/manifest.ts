import { createVerbosityControllerHook } from "../../../hooks/verbosity-controller"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "verbosity-controller",
  lifecycle: ["tool.execute.after"],
  factory: createVerbosityControllerHook,
}
