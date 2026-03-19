import { discoverInstalledPlugins, loadPluginCommands, loadPluginSkillsAsCommands, } from "../features/claude-code-plugin-loader";
export function discoverPluginCommandDefinitions(options) {
    if (options?.pluginsEnabled === false) {
        return {};
    }
    const { plugins } = discoverInstalledPlugins({
        enabledPluginsOverride: options?.enabledPluginsOverride,
    });
    return {
        ...loadPluginCommands(plugins),
        ...loadPluginSkillsAsCommands(plugins),
    };
}
