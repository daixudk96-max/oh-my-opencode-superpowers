import { createAnthropicEffortHook } from "../../../hooks/anthropic-effort"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "anthropic-effort",
  lifecycle: ["chat.params"],
  factory: createAnthropicEffortHook,
}
