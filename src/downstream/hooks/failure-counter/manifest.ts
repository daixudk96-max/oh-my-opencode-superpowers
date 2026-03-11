import type { HookManifest } from "../../types"
import { createFailureCounterHook } from "../../../hooks/failure-counter"

export const manifest: HookManifest = {
  name: "failure-counter",
  lifecycle: ["tool.execute.before", "tool.execute.after"],
  factory: createFailureCounterHook,
}
