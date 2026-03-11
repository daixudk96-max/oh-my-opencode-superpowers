import type { HookManifest } from "../../types"
import { createDebugInjectorHook } from "../../../hooks/debugging-injector"

export const manifest: HookManifest = {
  name: "debugging-injector",
  lifecycle: ["tool.execute.before", "tool.execute.after"],
  factory: createDebugInjectorHook,
}
