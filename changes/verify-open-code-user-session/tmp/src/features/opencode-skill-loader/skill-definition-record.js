export function skillsToCommandDefinitionRecord(skills) {
    const result = {};
    for (const skill of skills) {
        const { name: _name, argumentHint: _argumentHint, ...openCodeCompatible } = skill.definition;
        result[skill.name] = openCodeCompatible;
    }
    return result;
}
