import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { PACKAGE_NAME } from "../constants";
import { getConfigPaths } from "./config-paths";
import { stripJsonComments } from "./jsonc-strip";
export function isLocalDevMode(directory) {
    return getLocalDevPath(directory) !== null;
}
export function getLocalDevPath(directory) {
    for (const configPath of getConfigPaths(directory)) {
        try {
            if (!fs.existsSync(configPath))
                continue;
            const content = fs.readFileSync(configPath, "utf-8");
            const config = JSON.parse(stripJsonComments(content));
            const plugins = config.plugin ?? [];
            for (const entry of plugins) {
                if (entry.startsWith("file://") && entry.includes(PACKAGE_NAME)) {
                    try {
                        return fileURLToPath(entry);
                    }
                    catch {
                        return entry.replace("file://", "");
                    }
                }
            }
        }
        catch {
            continue;
        }
    }
    return null;
}
