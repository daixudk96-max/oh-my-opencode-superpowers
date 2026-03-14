import { createCommitSizeCheckerWrapper } from "../../patches/commit-size-checker-wrapper"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "commit-size-checker",
  lifecycle: ["tool.execute.before"],
  factory: createCommitSizeCheckerWrapper,
}
