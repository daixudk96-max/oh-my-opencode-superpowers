import { securityAuditSkill } from "../../../features/builtin-skills/skills/security-and-database"
import type { SkillManifest } from "../../types"

export const manifest: SkillManifest = {
  name: "security-audit",
  skill: securityAuditSkill,
}
