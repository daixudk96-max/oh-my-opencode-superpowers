import { createAnthropicContextWindowLimitRecoveryHook } from "../../../hooks/anthropic-context-window-limit-recovery"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "anthropic-context-window-limit-recovery",
  lifecycle: ["event"],
  factory: createAnthropicContextWindowLimitRecoveryHook,
}
