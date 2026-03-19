import { createBuiltinSkills } from "../../features/builtin-skills";
function mapScopeToLocation(scope) {
    if (scope === "user" || scope === "opencode")
        return "user";
    if (scope === "project" || scope === "opencode-project")
        return "project";
    return "plugin";
}
export function buildAvailableSkills(discoveredSkills, browserProvider, disabledSkills) {
    const builtinSkills = createBuiltinSkills({ browserProvider, disabledSkills });
    const builtinSkillNames = new Set(builtinSkills.map(s => s.name));
    const builtinAvailable = builtinSkills.map((skill) => ({
        name: skill.name,
        description: skill.description,
        location: "plugin",
    }));
    const discoveredAvailable = discoveredSkills
        .filter(s => !builtinSkillNames.has(s.name) && !disabledSkills?.has(s.name))
        .map((skill) => ({
        name: skill.name,
        description: skill.definition.description ?? "",
        location: mapScopeToLocation(skill.scope),
    }));
    return [...builtinAvailable, ...discoveredAvailable];
}
