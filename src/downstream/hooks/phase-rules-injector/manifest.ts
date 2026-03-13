import { createPhaseRulesInjectorHook } from "../../../hooks/phase-rules-injector"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "phase-rules-injector",
  lifecycle: ["chat.message"],
  factory: createPhaseRulesInjectorHook,
}
