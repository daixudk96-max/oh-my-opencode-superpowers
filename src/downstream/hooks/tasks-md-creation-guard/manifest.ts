import { createTasksMdCreationGuardHook } from "../../../hooks/tasks-md-creation-guard"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "tasks-md-creation-guard",
  lifecycle: ["tool.execute.before", "tool.execute.after"],
  factory: createTasksMdCreationGuardHook,
}
