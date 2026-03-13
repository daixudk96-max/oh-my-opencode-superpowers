import { createPrContextInjectorHook } from "../../../hooks/pr-context-injector"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "pr-context-injector",
  lifecycle: ["chat.message"],
  factory: createPrContextInjectorHook,
}
