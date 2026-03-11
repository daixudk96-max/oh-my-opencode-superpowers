import type { HookManifest } from "../../types"
import { createSubagentVerificationHook } from "../../../hooks/subagent-verification"

export const manifest: HookManifest = {
  name: "subagent-verification",
  lifecycle: ["tool.execute.after"],
  factory: createSubagentVerificationHook,
}
