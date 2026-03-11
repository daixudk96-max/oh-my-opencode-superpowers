import { waveParallelExecutionSkill } from "../../../features/builtin-skills/skills/workflow"
import type { SkillManifest } from "../../types"

export const manifest: SkillManifest = {
  name: "wave-parallel-execution",
  skill: waveParallelExecutionSkill,
}
