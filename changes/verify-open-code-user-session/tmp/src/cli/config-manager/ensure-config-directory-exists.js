import { existsSync, mkdirSync } from "node:fs";
import { getConfigDir } from "./config-context";
export function ensureConfigDirectoryExists() {
    const configDir = getConfigDir();
    if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
    }
}
