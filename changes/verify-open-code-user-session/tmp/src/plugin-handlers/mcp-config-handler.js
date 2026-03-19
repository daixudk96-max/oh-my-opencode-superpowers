import { discoverDownstreamMcps } from "../downstream/auto-registry";
import { createBuiltinMcpsWithStartupHealthCheck } from "../downstream/patches/mcp-startup-health-check";
import { loadMcpConfigs } from "../features/claude-code-mcp-loader";
function captureUserDisabledMcps(userMcp) {
    const disabled = new Set();
    if (!userMcp)
        return disabled;
    for (const [name, value] of Object.entries(userMcp)) {
        if (value &&
            typeof value === "object" &&
            "enabled" in value &&
            value.enabled === false) {
            disabled.add(name);
        }
    }
    return disabled;
}
export async function applyMcpConfig(params) {
    const disabledMcps = params.pluginConfig.disabled_mcps ?? [];
    const userMcp = params.config.mcp;
    const userDisabledMcps = captureUserDisabledMcps(userMcp);
    const [downstreamMcpManifests, mcpResult] = await Promise.all([
        discoverDownstreamMcps().catch(() => []),
        params.pluginConfig.claude_code?.mcp ?? true
            ? loadMcpConfigs(disabledMcps)
            : Promise.resolve({ servers: {} }),
    ]);
    const merged = {
        ...createBuiltinMcpsWithStartupHealthCheck(disabledMcps, params.pluginConfig, downstreamMcpManifests),
        ...(userMcp ?? {}),
        ...mcpResult.servers,
        ...params.pluginComponents.mcpServers,
    };
    for (const name of userDisabledMcps) {
        if (merged[name]) {
            merged[name] = { ...merged[name], enabled: false };
        }
    }
    const disabledSet = new Set(disabledMcps);
    for (const name of disabledSet) {
        delete merged[name];
    }
    params.config.mcp = merged;
}
