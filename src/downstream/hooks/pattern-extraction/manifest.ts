import { createPatternExtractionHook } from "../../../hooks/pattern-extraction"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "pattern-extraction",
  lifecycle: ["event"],
  factory: createPatternExtractionHook,
}
