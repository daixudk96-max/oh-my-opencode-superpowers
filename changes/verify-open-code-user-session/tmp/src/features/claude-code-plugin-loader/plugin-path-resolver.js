const CLAUDE_PLUGIN_ROOT_VAR = "${CLAUDE_PLUGIN_ROOT}";
export function resolvePluginPath(path, pluginRoot) {
    return path.replace(CLAUDE_PLUGIN_ROOT_VAR, pluginRoot);
}
export function resolvePluginPaths(obj, pluginRoot) {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj === "string") {
        return resolvePluginPath(obj, pluginRoot);
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => resolvePluginPaths(item, pluginRoot));
    }
    if (typeof obj === "object") {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = resolvePluginPaths(value, pluginRoot);
        }
        return result;
    }
    return obj;
}
