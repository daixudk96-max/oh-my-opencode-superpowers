import type { HookManifest } from "../../types"
import { createPreemptiveCompactionHook } from "../../../hooks/preemptive-compaction"

export const manifest: HookManifest = {
  name: "background-compaction",
  lifecycle: ["tool.execute.after", "event"],
  factory: createPreemptiveCompactionHook,
}
