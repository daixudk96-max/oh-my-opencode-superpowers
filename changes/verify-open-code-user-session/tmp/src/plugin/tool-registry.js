import { getMainSessionID } from "../features/claude-code-session-state";
import { log } from "../shared";
import { filterDisabledTools } from "../shared/disabled-tools";
import { createAstGrepTools, createBackgroundTools, createBuiltinTools, createCallOmoAgent, createDelegateTask, createGlobTools, createGrepTools, createHashlineEditTool, createLookAt, createSessionManagerTools, createSkillMcpTool, createSkillTool, createTaskCreateTool, createTaskGetTool, createTaskList, createTaskUpdateTool, discoverCommandsSync, interactive_bash, } from "../tools";
export function createToolRegistry(args) {
    const { ctx, pluginConfig, managers, skillContext, availableCategories, additionalTools, } = args;
    const backgroundTools = createBackgroundTools(managers.backgroundManager, ctx.client);
    const callOmoAgent = createCallOmoAgent(ctx, managers.backgroundManager, pluginConfig.disabled_agents ?? []);
    const isMultimodalLookerEnabled = !(pluginConfig.disabled_agents ?? []).some((agent) => agent.toLowerCase() === "multimodal-looker");
    const lookAt = isMultimodalLookerEnabled ? createLookAt(ctx) : null;
    const delegateTask = createDelegateTask({
        manager: managers.backgroundManager,
        client: ctx.client,
        directory: ctx.directory,
        userCategories: pluginConfig.categories,
        agentOverrides: pluginConfig.agents,
        gitMasterConfig: pluginConfig.git_master,
        sisyphusJuniorModel: pluginConfig.agents?.["sisyphus-junior"]?.model,
        browserProvider: skillContext.browserProvider,
        disabledSkills: skillContext.disabledSkills,
        availableCategories,
        availableSkills: skillContext.availableSkills,
        syncPollTimeoutMs: pluginConfig.background_task?.syncPollTimeoutMs,
        onSyncSessionCreated: async (event) => {
            log("[index] onSyncSessionCreated callback", {
                sessionID: event.sessionID,
                parentID: event.parentID,
                title: event.title,
            });
            await managers.tmuxSessionManager.onSessionCreated({
                type: "session.created",
                properties: {
                    info: {
                        id: event.sessionID,
                        parentID: event.parentID,
                        title: event.title,
                    },
                },
            });
        },
    });
    const getSessionIDForMcp = () => getMainSessionID() || "";
    const skillMcpTool = createSkillMcpTool({
        manager: managers.skillMcpManager,
        getLoadedSkills: () => skillContext.mergedSkills,
        getSessionID: getSessionIDForMcp,
    });
    const commands = discoverCommandsSync(ctx.directory, {
        pluginsEnabled: pluginConfig.claude_code?.plugins ?? true,
        enabledPluginsOverride: pluginConfig.claude_code?.plugins_override,
    });
    const skillTool = createSkillTool({
        commands,
        skills: skillContext.mergedSkills,
        mcpManager: managers.skillMcpManager,
        getSessionID: getSessionIDForMcp,
        gitMasterConfig: pluginConfig.git_master,
    });
    const taskSystemEnabled = pluginConfig.experimental?.task_system ?? false;
    const taskToolsRecord = taskSystemEnabled
        ? {
            task_create: createTaskCreateTool(pluginConfig, ctx),
            task_get: createTaskGetTool(pluginConfig),
            task_list: createTaskList(pluginConfig),
            task_update: createTaskUpdateTool(pluginConfig, ctx),
        }
        : {};
    const hashlineEnabled = pluginConfig.hashline_edit ?? false;
    const hashlineToolsRecord = hashlineEnabled
        ? { edit: createHashlineEditTool() }
        : {};
    const allTools = {
        ...createBuiltinTools({ additionalTools }),
        ...createGrepTools(ctx),
        ...createGlobTools(ctx),
        ...createAstGrepTools(ctx),
        ...createSessionManagerTools(ctx),
        ...backgroundTools,
        call_omo_agent: callOmoAgent,
        ...(lookAt ? { look_at: lookAt } : {}),
        task: delegateTask,
        skill_mcp: skillMcpTool,
        skill: skillTool,
        interactive_bash,
        ...taskToolsRecord,
        ...hashlineToolsRecord,
    };
    const filteredTools = filterDisabledTools(allTools, pluginConfig.disabled_tools);
    return {
        filteredTools,
        taskSystemEnabled,
    };
}
