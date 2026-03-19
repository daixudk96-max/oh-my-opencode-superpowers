import { join } from "path";
import { existsSync } from "fs";
import { getClaudeConfigDir } from "../../shared";
function normalizeHookMatcher(raw) {
    return {
        matcher: raw.matcher ?? raw.pattern ?? "*",
        hooks: Array.isArray(raw.hooks) ? raw.hooks : [],
    };
}
function normalizeHooksConfig(raw) {
    const result = {};
    const eventTypes = [
        "PreToolUse",
        "PostToolUse",
        "UserPromptSubmit",
        "Stop",
        "PreCompact",
    ];
    for (const eventType of eventTypes) {
        if (raw[eventType]) {
            result[eventType] = raw[eventType].map(normalizeHookMatcher);
        }
    }
    return result;
}
export function getClaudeSettingsPaths(customPath) {
    const claudeConfigDir = getClaudeConfigDir();
    const paths = [
        join(claudeConfigDir, "settings.json"),
        join(process.cwd(), ".claude", "settings.json"),
        join(process.cwd(), ".claude", "settings.local.json"),
    ];
    if (customPath && existsSync(customPath)) {
        paths.unshift(customPath);
    }
    // Deduplicate paths to prevent loading the same file multiple times
    // (e.g., when cwd is the home directory)
    return [...new Set(paths)];
}
function mergeHooksConfig(base, override) {
    const result = { ...base };
    const eventTypes = [
        "PreToolUse",
        "PostToolUse",
        "UserPromptSubmit",
        "Stop",
        "PreCompact",
    ];
    for (const eventType of eventTypes) {
        if (override[eventType]) {
            result[eventType] = [...(base[eventType] || []), ...override[eventType]];
        }
    }
    return result;
}
export async function loadClaudeHooksConfig(customSettingsPath) {
    const paths = getClaudeSettingsPaths(customSettingsPath);
    let mergedConfig = {};
    for (const settingsPath of paths) {
        if (existsSync(settingsPath)) {
            try {
                const content = await Bun.file(settingsPath).text();
                const settings = JSON.parse(content);
                if (settings.hooks) {
                    const normalizedHooks = normalizeHooksConfig(settings.hooks);
                    mergedConfig = mergeHooksConfig(mergedConfig, normalizedHooks);
                }
            }
            catch {
                continue;
            }
        }
    }
    return Object.keys(mergedConfig).length > 0 ? mergedConfig : null;
}
