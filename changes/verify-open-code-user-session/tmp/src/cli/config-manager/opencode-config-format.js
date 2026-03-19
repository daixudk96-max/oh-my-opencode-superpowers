import { existsSync } from "node:fs";
import { getConfigJson, getConfigJsonc } from "./config-context";
export function detectConfigFormat() {
    const configJsonc = getConfigJsonc();
    const configJson = getConfigJson();
    if (existsSync(configJsonc)) {
        return { format: "jsonc", path: configJsonc };
    }
    if (existsSync(configJson)) {
        return { format: "json", path: configJson };
    }
    return { format: "none", path: configJson };
}
