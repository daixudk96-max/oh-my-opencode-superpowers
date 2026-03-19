/**
 * MCP Health Checker
 *
 * Async health checking and graceful degradation for remote MCP services.
 * Checks availability at startup and marks unavailable MCPs as degraded.
 */
/**
 * MCP health status
 */
export var McpStatus;
(function (McpStatus) {
    McpStatus["HEALTHY"] = "HEALTHY";
    McpStatus["DEGRADED"] = "DEGRADED";
    McpStatus["UNKNOWN"] = "UNKNOWN";
})(McpStatus || (McpStatus = {}));
/**
 * MCP Health Checker implementation
 */
class McpHealthCheckerImpl {
    statusMap = new Map();
    mockHealthMap = new Map();
    logger = () => { };
    async checkHealth(mcpName) {
        const mockConfig = this.mockHealthMap.get(mcpName);
        if (mockConfig) {
            const result = {
                name: mcpName,
                status: mockConfig.available ? McpStatus.HEALTHY : McpStatus.DEGRADED,
                reason: mockConfig.reason,
                checkedAt: new Date(),
            };
            this.statusMap.set(mcpName, result);
            if (!mockConfig.available) {
                this.logger(`[MCP Health] ${mcpName} marked as DEGRADED: ${mockConfig.reason || "unavailable"}`);
            }
            return result;
        }
        // In real implementation, would ping the MCP endpoint
        const result = {
            name: mcpName,
            status: McpStatus.UNKNOWN,
            checkedAt: new Date(),
        };
        this.statusMap.set(mcpName, result);
        return result;
    }
    async checkAllOnStartup(mcpNames) {
        // Check all MCPs in parallel
        await Promise.all(mcpNames.map((name) => this.checkHealth(name)));
    }
    getStatus(mcpName) {
        const result = this.statusMap.get(mcpName);
        return result?.status || McpStatus.UNKNOWN;
    }
    getDegradedMcps() {
        const degraded = [];
        for (const [name, result] of this.statusMap) {
            if (result.status === McpStatus.DEGRADED) {
                degraded.push(name);
            }
        }
        return degraded;
    }
    generateReport() {
        const lines = [];
        lines.push("## MCP Health Report");
        lines.push("");
        if (this.statusMap.size === 0) {
            lines.push("No MCPs checked.");
            return lines.join("\n");
        }
        lines.push("| MCP | Status | Reason |");
        lines.push("|-----|--------|--------|");
        for (const [name, result] of this.statusMap) {
            const statusIcon = result.status === McpStatus.HEALTHY ? "✅" :
                result.status === McpStatus.DEGRADED ? "❌" : "❓";
            lines.push(`| ${name} | ${statusIcon} ${result.status} | ${result.reason || "-"} |`);
        }
        const degradedCount = this.getDegradedMcps().length;
        lines.push("");
        lines.push(`**Summary**: ${this.statusMap.size - degradedCount}/${this.statusMap.size} MCPs healthy`);
        return lines.join("\n");
    }
    setLogger(logger) {
        this.logger = logger;
    }
    setMockHealth(mcpName, available, reason) {
        this.mockHealthMap.set(mcpName, { available, reason });
    }
}
/**
 * Create a new MCP Health Checker instance
 */
export function createMcpHealthChecker() {
    return new McpHealthCheckerImpl();
}
