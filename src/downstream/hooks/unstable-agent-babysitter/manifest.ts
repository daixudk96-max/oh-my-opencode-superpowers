import { createUnstableAgentBabysitterHook } from "../../../hooks/unstable-agent-babysitter"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "unstable-agent-babysitter",
  lifecycle: ["event"],
  factory: createUnstableAgentBabysitterHook,
}
