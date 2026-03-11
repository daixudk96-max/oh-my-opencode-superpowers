import { createMdselEnforcerHook } from "../../../hooks/mdsel-enforcer"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "mdsel-enforcer",
  lifecycle: ["tool.execute.before"],
  factory: createMdselEnforcerHook,
}
