import { createInstinctLearnerHook } from "../../../hooks/instinct-learner"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "instinct-learner",
  lifecycle: ["tool.execute.after", "event"],
  factory: createInstinctLearnerHook,
}
