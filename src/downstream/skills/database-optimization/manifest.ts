import { databaseOptimizationSkill } from "../../../features/builtin-skills/skills/security-and-database"
import type { SkillManifest } from "../../types"

export const manifest: SkillManifest = {
  name: "database-optimization",
  skill: databaseOptimizationSkill,
}
