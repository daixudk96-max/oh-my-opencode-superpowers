import type { OhMyOpenCodeConfig } from "../config";
import { discoverDownstreamMcps } from "../downstream/auto-registry";
import { createBuiltinMcpsWithStartupHealthCheck } from "../downstream/patches/mcp-startup-health-check";
import { loadMcpConfigs } from "../features/claude-code-mcp-loader";
import type { PluginComponents } from "./plugin-components-loader";

type McpEntry = Record<string, unknown>;

function captureUserDisabledMcps(
  userMcp: Record<string, unknown> | undefined
): Set<string> {
  const disabled = new Set<string>();
  if (!userMcp) return disabled;

  for (const [name, value] of Object.entries(userMcp)) {
    if (
      value &&
      typeof value === "object" &&
      "enabled" in value &&
      (value as McpEntry).enabled === false
    ) {
      disabled.add(name);
    }
  }

  return disabled;
}

export async function applyMcpConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: OhMyOpenCodeConfig;
  pluginComponents: PluginComponents;
}): Promise<void> {
  const disabledMcps = params.pluginConfig.disabled_mcps ?? [];
  const userMcp = params.config.mcp as Record<string, unknown> | undefined;
  const userDisabledMcps = captureUserDisabledMcps(userMcp);

  const [downstreamMcpManifests, mcpResult] = await Promise.all([
    discoverDownstreamMcps().catch(() => []),
    params.pluginConfig.claude_code?.mcp ?? true
      ? loadMcpConfigs(disabledMcps)
      : Promise.resolve({ servers: {} }),
  ]);

  const merged = {
    ...createBuiltinMcpsWithStartupHealthCheck(
      disabledMcps,
      params.pluginConfig,
      downstreamMcpManifests,
    ),
    ...(userMcp ?? {}),
    ...mcpResult.servers,
    ...params.pluginComponents.mcpServers,
  } as Record<string, McpEntry>;

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
