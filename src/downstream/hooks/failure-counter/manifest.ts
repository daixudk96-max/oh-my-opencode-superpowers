import { createFailureCounterHook } from "../../../hooks/failure-counter"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "failure-counter",
  lifecycle: ["tool.execute.before", "tool.execute.after", "UserPromptSubmit"],
  factory: createFailureCounterHook,
}
