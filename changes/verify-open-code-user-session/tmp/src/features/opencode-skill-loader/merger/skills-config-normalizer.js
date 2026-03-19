export function normalizeSkillsConfig(config) {
    if (!config) {
        return { sources: [], enable: [], disable: [], entries: {} };
    }
    if (Array.isArray(config)) {
        return { sources: [], enable: config, disable: [], entries: {} };
    }
    const { sources = [], enable = [], disable = [], ...entries } = config;
    return { sources, enable, disable, entries };
}
