import { readFileSync } from "node:fs";
import { parseFrontmatter } from "../../shared/frontmatter";
export function extractSkillTemplate(skill) {
    if (skill.path) {
        const content = readFileSync(skill.path, "utf-8");
        const { body } = parseFrontmatter(content);
        return body.trim();
    }
    return skill.definition.template || "";
}
