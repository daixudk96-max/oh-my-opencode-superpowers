import { createInstinctTriggerHook } from "../../../hooks/instinct-trigger"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "instinct-trigger",
  lifecycle: ["tool.execute.before"],
  factory: createInstinctTriggerHook,
}
