import { createNotepadWriteGuardHook } from "../../../hooks/notepad-write-guard"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "notepad-write-guard",
  lifecycle: ["tool.execute.before"],
  factory: createNotepadWriteGuardHook,
}
