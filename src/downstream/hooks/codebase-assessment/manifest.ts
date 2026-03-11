import type { HookManifest } from "../../types"
import { createCodebaseAssessmentHook } from "../../../hooks/codebase-assessment"

export const manifest: HookManifest = {
  name: "codebase-assessment",
  lifecycle: ["tool.execute.before"],
  factory: createCodebaseAssessmentHook,
}
