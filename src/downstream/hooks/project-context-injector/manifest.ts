import { createProjectContextInjectorHook } from "../../../hooks/project-context-injector"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "project-context-injector",
  lifecycle: ["chat.message"],
  factory: createProjectContextInjectorHook,
}
