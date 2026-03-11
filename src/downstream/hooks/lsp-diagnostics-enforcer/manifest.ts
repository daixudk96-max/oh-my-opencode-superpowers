import type { HookManifest } from "../../types"
import { createLspDiagnosticsEnforcerHook } from "../../../hooks/lsp-diagnostics-enforcer"

export const manifest: HookManifest = {
  name: "lsp-diagnostics-enforcer",
  lifecycle: ["tool.execute.after"],
  factory: createLspDiagnosticsEnforcerHook,
}
