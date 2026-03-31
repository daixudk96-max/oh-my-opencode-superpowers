import { createContractLockPreparerHook } from "../../../hooks/contract-lock-preparer"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "contract-lock-preparer",
  lifecycle: ["tool.execute.before"],
  factory: createContractLockPreparerHook,
}
