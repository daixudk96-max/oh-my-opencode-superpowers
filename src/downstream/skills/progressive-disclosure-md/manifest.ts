import { progressiveDisclosureMdSkill } from "../../../features/builtin-skills/skills/mdsel"
import type { SkillManifest } from "../../types"

export const manifest: SkillManifest = {
  name: "progressive-disclosure-md",
  skill: progressiveDisclosureMdSkill,
}
