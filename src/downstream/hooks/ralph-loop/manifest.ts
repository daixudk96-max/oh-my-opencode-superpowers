import { createRalphLoopHook } from "../../../hooks/ralph-loop"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "ralph-loop",
  lifecycle: ["event"],
  factory: createRalphLoopHook,
}
