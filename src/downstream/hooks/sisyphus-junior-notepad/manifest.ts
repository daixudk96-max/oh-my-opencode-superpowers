import { createSisyphusJuniorNotepadHook } from "../../../hooks/sisyphus-junior-notepad"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "sisyphus-junior-notepad",
  lifecycle: ["tool.execute.before"],
  factory: createSisyphusJuniorNotepadHook,
}
