export function builtinToLoadedSkill(builtin) {
    const definition = {
        name: builtin.name,
        description: `(opencode - Skill) ${builtin.description}`,
        template: builtin.template,
        model: builtin.model,
        agent: builtin.agent,
        subtask: builtin.subtask,
        argumentHint: builtin.argumentHint,
    };
    return {
        name: builtin.name,
        definition,
        scope: "builtin",
        license: builtin.license,
        compatibility: builtin.compatibility,
        metadata: builtin.metadata,
        allowedTools: builtin.allowedTools,
        mcpConfig: builtin.mcpConfig,
    };
}
