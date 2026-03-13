import { createObserverDetectorHook } from "../../../hooks/observer-detector"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "observer-detector",
  lifecycle: ["tool.execute.after", "event"],
  factory: createObserverDetectorHook,
}
