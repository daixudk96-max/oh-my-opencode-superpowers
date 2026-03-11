import { createDirectoryAgentsInjectorHook } from "../../../hooks/directory-agents-injector"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "directory-agents-injector",
  lifecycle: ["tool.execute.before", "tool.execute.after", "event"],
  factory: createDirectoryAgentsInjectorHook,
}
