import { log } from "../shared/logger";
import { context7 } from "./context7";
import { grep_app } from "./grep-app";
import { createMcpHealthChecker } from "./health-checker";
import { createLazyMcpRegistry } from "./lazy-loader";
import { createPostHookTrigger } from "./post-hook-trigger";
import { resolveMcpTemplates } from "./templates";
import { createWebsearchConfig } from "./websearch";
export { createMcpHealthChecker } from "./health-checker";
export { createLazyMcpRegistry } from "./lazy-loader";
export { createPostHookTrigger } from "./post-hook-trigger";
export { resolveMcpTemplates } from "./templates";
export { McpNameSchema } from "./types";
const DEFAULT_TOOL_COUNT_WARNING_THRESHOLD = 80;
/**
 * Check if the number of MCP tools exceeds the warning threshold.
 * Logs a warning but does not block startup.
 */
export function checkMcpToolCount(toolCount, options = {}) {
    const threshold = options.threshold ?? DEFAULT_TOOL_COUNT_WARNING_THRESHOLD;
    if (toolCount > threshold) {
        const message = `[MCP Warning] Tool count (${toolCount}) exceeds threshold (${threshold}). ` +
            `Consider disabling unused MCPs to improve performance and reduce confusion.`;
        log(message);
        return { warned: true, message };
    }
    return { warned: false };
}
export function createBuiltinMcps(disabledMcps = [], config, additionalMcps = []) {
    const mcps = {};
    const mcpConfig = config?.mcp;
    if (!disabledMcps.includes("websearch")) {
        mcps.websearch = createWebsearchConfig(config?.websearch);
    }
    if (!disabledMcps.includes("context7")) {
        mcps.context7 = context7;
    }
    if (!disabledMcps.includes("grep_app")) {
        mcps.grep_app = grep_app;
    }
    // Add template-based MCPs if configured
    if (mcpConfig?.templates) {
        const templateMcps = resolveMcpTemplates(mcpConfig.templates);
        for (const [name, mcpConfig] of Object.entries(templateMcps)) {
            if (!disabledMcps.includes(name)) {
                mcps[name] = mcpConfig;
            }
        }
    }
    for (const manifest of additionalMcps) {
        if (disabledMcps.includes(manifest.name))
            continue;
        if (mcps[manifest.name])
            continue;
        mcps[manifest.name] = manifest.configFactory(config);
    }
    const toolCount = Object.keys(mcps).length;
    checkMcpToolCount(toolCount, { threshold: mcpConfig?.tool_count_warning_threshold });
    return mcps;
}
/**
 * Registry for lazy-loaded MCPs
 */
export const lazyMcpRegistry = createLazyMcpRegistry();
/**
 * Health checker for remote MCPs
 */
export const mcpHealthChecker = createMcpHealthChecker();
/**
 * Global instance of MCP post-hook trigger
 */
export const mcpPostHookTrigger = createPostHookTrigger({
    enabled: true,
    timeoutMs: 10000,
});
