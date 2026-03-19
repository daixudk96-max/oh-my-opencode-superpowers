import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { EMPTY_CACHE } from "./types";
const CACHE_FILENAME = "skill-triggers.json";
/**
 * Get the cache file path.
 * Location: ~/.config/opencode/skill-triggers.json
 */
export function getCachePath() {
    return join(homedir(), ".config", "opencode", CACHE_FILENAME);
}
/**
 * Load cache from disk.
 * Returns EMPTY_CACHE if file doesn't exist or is corrupted.
 */
export function loadCache() {
    const cachePath = getCachePath();
    if (!existsSync(cachePath)) {
        return { ...EMPTY_CACHE };
    }
    try {
        const content = readFileSync(cachePath, "utf-8");
        const parsed = JSON.parse(content);
        // Validate basic structure
        if (!parsed.version || !parsed.skills) {
            return { ...EMPTY_CACHE };
        }
        return parsed;
    }
    catch {
        // JSON parse error or read error
        return { ...EMPTY_CACHE };
    }
}
/**
 * Save cache to disk.
 * Creates directory if it doesn't exist.
 */
export function saveCache(cache) {
    const cachePath = getCachePath();
    const cacheDir = dirname(cachePath);
    if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
    }
    writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
}
