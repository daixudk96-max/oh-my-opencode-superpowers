import { parseFrontmatter } from "../../shared/frontmatter";
function normalizeStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
}
function normalizePriority(value) {
    if (value === "high" || value === "low" || value === "medium") {
        return value;
    }
    return "medium";
}
export function parseSkillTemplate(content) {
    const { data, body, hadFrontmatter } = parseFrontmatter(content);
    return {
        template: body.trim(),
        description: typeof data.description === "string" ? data.description.trim() : undefined,
        hooks: normalizeStringArray(data.hooks),
        triggers: normalizeStringArray(data.triggers),
        priority: normalizePriority(data.priority),
        hasFrontmatter: hadFrontmatter,
    };
}
