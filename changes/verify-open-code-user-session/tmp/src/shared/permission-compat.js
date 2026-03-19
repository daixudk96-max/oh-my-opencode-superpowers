/**
 * Permission system utilities for OpenCode 1.1.1+.
 * This module only supports the new permission format.
 */
/**
 * Creates tool restrictions that deny specified tools.
 */
export function createAgentToolRestrictions(denyTools) {
    return {
        permission: Object.fromEntries(denyTools.map((tool) => [tool, "deny"])),
    };
}
/**
 * Creates tool restrictions that ONLY allow specified tools.
 * All other tools are denied by default using `*: deny` pattern.
 */
export function createAgentToolAllowlist(allowTools) {
    return {
        permission: {
            "*": "deny",
            ...Object.fromEntries(allowTools.map((tool) => [tool, "allow"])),
        },
    };
}
/**
 * Converts legacy tools format to permission format.
 * For migrating user configs from older versions.
 */
export function migrateToolsToPermission(tools) {
    return Object.fromEntries(Object.entries(tools).map(([key, value]) => [
        key,
        value ? "allow" : "deny",
    ]));
}
/**
 * Migrates agent config from legacy tools format to permission format.
 * If config has `tools`, converts to `permission`.
 */
export function migrateAgentConfig(config) {
    const result = { ...config };
    if (result.tools && typeof result.tools === "object") {
        const existingPermission = result.permission || {};
        const migratedPermission = migrateToolsToPermission(result.tools);
        result.permission = { ...migratedPermission, ...existingPermission };
        delete result.tools;
    }
    if (result.permission && typeof result.permission === "object") {
        const perm = { ...result.permission };
        if ("delegate_task" in perm && !("task" in perm)) {
            perm["task"] = perm["delegate_task"];
            delete perm["delegate_task"];
            result.permission = perm;
        }
    }
    return result;
}
