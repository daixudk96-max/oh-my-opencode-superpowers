import { log } from "../../shared/logger";
import { discoverInstalledPlugins } from "./discovery";
import { loadPluginCommands } from "./command-loader";
import { loadPluginSkillsAsCommands } from "./skill-loader";
import { loadPluginAgents } from "./agent-loader";
import { loadPluginMcpServers } from "./mcp-server-loader";
import { loadPluginHooksConfigs } from "./hook-loader";
export { discoverInstalledPlugins } from "./discovery";
export { loadPluginCommands } from "./command-loader";
export { loadPluginSkillsAsCommands } from "./skill-loader";
export { loadPluginAgents } from "./agent-loader";
export { loadPluginMcpServers } from "./mcp-server-loader";
export { loadPluginHooksConfigs } from "./hook-loader";
export async function loadAllPluginComponents(options) {
    const { plugins, errors } = discoverInstalledPlugins(options);
    const [commands, skills, agents, mcpServers, hooksConfigs] = await Promise.all([
        Promise.resolve(loadPluginCommands(plugins)),
        Promise.resolve(loadPluginSkillsAsCommands(plugins)),
        Promise.resolve(loadPluginAgents(plugins)),
        loadPluginMcpServers(plugins),
        Promise.resolve(loadPluginHooksConfigs(plugins)),
    ]);
    log(`Loaded ${plugins.length} plugins with ${Object.keys(commands).length} commands, ${Object.keys(skills).length} skills, ${Object.keys(agents).length} agents, ${Object.keys(mcpServers).length} MCP servers`);
    return {
        commands,
        skills,
        agents,
        mcpServers,
        hooksConfigs,
        plugins,
        errors,
    };
}
