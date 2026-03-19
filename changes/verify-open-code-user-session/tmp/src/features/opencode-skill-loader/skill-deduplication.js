export function deduplicateSkillsByName(skills) {
    const seen = new Set();
    const result = [];
    for (const skill of skills) {
        if (!seen.has(skill.name)) {
            seen.add(skill.name);
            result.push(skill);
        }
    }
    return result;
}
