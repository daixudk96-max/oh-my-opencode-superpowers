import { discoverDownstreamSkills } from "../downstream/auto-registry";
import { createBuiltinSkills } from "../features/builtin-skills";
import { getSystemMcpServerNames } from "../features/claude-code-mcp-loader";
import { discoverConfigSourceSkills, discoverGlobalAgentsSkills, discoverOpencodeGlobalSkills, discoverOpencodeProjectSkills, discoverProjectAgentsSkills, discoverProjectClaudeSkills, discoverUserClaudeSkills, mergeSkills, } from "../features/opencode-skill-loader";
function mapScopeToLocation(scope) {
    if (scope === "user" || scope === "opencode")
        return "user";
    if (scope === "project" || scope === "opencode-project")
        return "project";
    return "plugin";
}
export async function createSkillContext(args) {
    const { directory, pluginConfig } = args;
    const browserProvider = pluginConfig.browser_automation_engine?.provider ?? "playwright";
    const disabledSkills = new Set(pluginConfig.disabled_skills ?? []);
    const systemMcpNames = getSystemMcpServerNames();
    const includeClaudeSkills = pluginConfig.claude_code?.skills !== false;
    const [downstreamSkillManifests, configSourceSkills, userSkills, globalSkills, projectSkills, opencodeProjectSkills, agentsProjectSkills, agentsGlobalSkills,] = await Promise.all([
        discoverDownstreamSkills().catch(() => []),
        discoverConfigSourceSkills({
            config: pluginConfig.skills,
            configDir: directory,
        }),
        includeClaudeSkills ? discoverUserClaudeSkills() : Promise.resolve([]),
        discoverOpencodeGlobalSkills(),
        includeClaudeSkills
            ? discoverProjectClaudeSkills(directory)
            : Promise.resolve([]),
        discoverOpencodeProjectSkills(directory),
        discoverProjectAgentsSkills(directory),
        discoverGlobalAgentsSkills(),
    ]);
    const builtinSkills = createBuiltinSkills({
        browserProvider,
        disabledSkills,
        additionalSkills: downstreamSkillManifests.map((manifest) => manifest.skill),
    }).filter((skill) => {
        if (skill.mcpConfig) {
            for (const mcpName of Object.keys(skill.mcpConfig)) {
                if (systemMcpNames.has(mcpName))
                    return false;
            }
        }
        return true;
    });
    const mergedSkills = mergeSkills(builtinSkills, pluginConfig.skills, configSourceSkills, [...userSkills, ...agentsGlobalSkills], globalSkills, [...projectSkills, ...agentsProjectSkills], opencodeProjectSkills, { configDir: directory });
    const availableSkills = mergedSkills.map((skill) => ({
        name: skill.name,
        description: skill.definition.description ?? "",
        location: mapScopeToLocation(skill.scope),
    }));
    return {
        mergedSkills,
        availableSkills,
        browserProvider,
        disabledSkills,
    };
}
