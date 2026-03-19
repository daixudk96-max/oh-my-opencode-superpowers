import { createBuiltinMcps, mcpHealthChecker } from "../../mcp";
import { log } from "../../shared/logger";
/**
 * Pattern C wrapper: keep builtin MCP creation unchanged,
 * add non-blocking startup health checks.
 */
export function createBuiltinMcpsWithStartupHealthCheck(disabledMcps = [], config, additionalMcps = []) {
    const manifestMcps = Array.isArray(additionalMcps) ? additionalMcps : [];
    const mcps = createBuiltinMcps(disabledMcps, config, manifestMcps);
    const names = Object.keys(mcps);
    if (names.length === 0) {
        return mcps;
    }
    void mcpHealthChecker
        .checkAllOnStartup(names)
        .then(() => {
        const degraded = mcpHealthChecker.getDegradedMcps();
        if (degraded.length > 0) {
            log("[MCP Health] Startup check completed with degraded MCPs", {
                degraded,
                total: names.length,
            });
            return;
        }
        log("[MCP Health] Startup check completed", { total: names.length });
    })
        .catch((error) => {
        log("[MCP Health] Startup check failed", {
            error: error instanceof Error ? error.message : String(error),
        });
    });
    return mcps;
}
