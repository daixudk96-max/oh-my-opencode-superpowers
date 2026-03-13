import { createSecretScannerHook } from "../../../hooks/secret-scanner"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "secret-scanner",
  lifecycle: ["tool.execute.before"],
  factory: createSecretScannerHook,
}
