import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { BUILTIN_SERVERS } from "./constants";
import { getOpenCodeConfigDir } from "../../shared";
import { parseJsonc, detectConfigFile } from "../../shared/jsonc-parser";
export function loadJsonFile(path) {
    if (!existsSync(path))
        return null;
    try {
        return parseJsonc(readFileSync(path, "utf-8"));
    }
    catch {
        return null;
    }
}
export function getConfigPaths() {
    const cwd = process.cwd();
    const configDir = getOpenCodeConfigDir({ binary: "opencode" });
    return {
        project: detectConfigFile(join(cwd, ".opencode", "oh-my-opencode")).path,
        user: detectConfigFile(join(configDir, "oh-my-opencode")).path,
        opencode: detectConfigFile(join(configDir, "opencode")).path,
    };
}
export function loadAllConfigs() {
    const paths = getConfigPaths();
    const configs = new Map();
    const project = loadJsonFile(paths.project);
    if (project)
        configs.set("project", project);
    const user = loadJsonFile(paths.user);
    if (user)
        configs.set("user", user);
    const opencode = loadJsonFile(paths.opencode);
    if (opencode)
        configs.set("opencode", opencode);
    return configs;
}
export function getMergedServers() {
    const configs = loadAllConfigs();
    const servers = [];
    const disabled = new Set();
    const seen = new Set();
    const sources = ["project", "user", "opencode"];
    for (const source of sources) {
        const config = configs.get(source);
        if (!config?.lsp)
            continue;
        for (const [id, entry] of Object.entries(config.lsp)) {
            if (entry.disabled) {
                disabled.add(id);
                continue;
            }
            if (seen.has(id))
                continue;
            if (!entry.command || !entry.extensions)
                continue;
            servers.push({
                id,
                command: entry.command,
                extensions: entry.extensions,
                priority: entry.priority ?? 0,
                env: entry.env,
                initialization: entry.initialization,
                source,
            });
            seen.add(id);
        }
    }
    for (const [id, config] of Object.entries(BUILTIN_SERVERS)) {
        if (disabled.has(id) || seen.has(id))
            continue;
        servers.push({
            id,
            command: config.command,
            extensions: config.extensions,
            priority: -100,
            source: "opencode",
        });
    }
    return servers.sort((a, b) => {
        if (a.source !== b.source) {
            const order = { project: 0, user: 1, opencode: 2 };
            return order[a.source] - order[b.source];
        }
        return b.priority - a.priority;
    });
}
