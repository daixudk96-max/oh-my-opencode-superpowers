import * as fs from "node:fs";
import { PACKAGE_NAME } from "../constants";
import { getConfigPaths } from "./config-paths";
import { stripJsonComments } from "./jsonc-strip";
function isExplicitVersionPin(pinnedVersion) {
    return /^\d+\.\d+\.\d+/.test(pinnedVersion);
}
export function findPluginEntry(directory) {
    for (const configPath of getConfigPaths(directory)) {
        try {
            if (!fs.existsSync(configPath))
                continue;
            const content = fs.readFileSync(configPath, "utf-8");
            const config = JSON.parse(stripJsonComments(content));
            const plugins = config.plugin ?? [];
            for (const entry of plugins) {
                if (entry === PACKAGE_NAME) {
                    return { entry, isPinned: false, pinnedVersion: null, configPath };
                }
                if (entry.startsWith(`${PACKAGE_NAME}@`)) {
                    const pinnedVersion = entry.slice(PACKAGE_NAME.length + 1);
                    const isPinned = isExplicitVersionPin(pinnedVersion);
                    return { entry, isPinned, pinnedVersion, configPath };
                }
            }
        }
        catch {
            continue;
        }
    }
    return null;
}
