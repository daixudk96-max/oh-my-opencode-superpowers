// TDD-EXEMPT: reason="Verified Task 3.7 registration ordering"
import { initConfigContext } from "./cli/config-manager/config-context";
import { createHooks } from "./create-hooks";
import { createManagers } from "./create-managers";
import { createTools } from "./create-tools";
import { bootstrapDownstreamHooks } from "./downstream/runtime-hook-executor";
import { loadPluginConfig } from "./plugin-config";
import { createPluginInterface } from "./plugin-interface";
import { createModelCacheState } from "./plugin-state";
import { createContextDetector, injectServerAuthIntoClient, log, } from "./shared";
import { createFirstMessageVariantGate } from "./shared/first-message-variant";
import { repairMisbucketedSessionMetadata } from "./shared/session-bucket-repair";
import { startTmuxCheck } from "./tools";
const OhMyOpenCodePlugin = async (ctx) => {
    // Initialize config context for plugin runtime (prevents warnings from hooks)
    initConfigContext("opencode", null);
    log("[OhMyOpenCodePlugin] ENTRY - plugin loading", {
        directory: ctx.directory,
    });
    injectServerAuthIntoClient(ctx.client);
    startTmuxCheck();
    const pluginConfig = loadPluginConfig(ctx.directory, ctx);
    const detector = createContextDetector();
    const projectContext = detector.detect(ctx.directory);
    const disabledHooks = new Set();
    const disabledHookConfigs = pluginConfig.disabled_hooks;
    for (const hookConfig of disabledHookConfigs ?? []) {
        const name = typeof hookConfig === "string" ? hookConfig : hookConfig.name;
        const condition = typeof hookConfig === "string" ? undefined : hookConfig.when;
        if (!condition || detector.matchesCondition(projectContext, condition)) {
            disabledHooks.add(name);
        }
    }
    const downstreamHooks = await bootstrapDownstreamHooks({
        ctx,
        disabledHooks,
    });
    const isHookEnabled = (hookName) => !disabledHooks.has(hookName);
    const safeHookEnabled = pluginConfig.experimental?.safe_hook_creation ?? true;
    const firstMessageVariantGate = createFirstMessageVariantGate();
    const tmuxConfig = {
        enabled: pluginConfig.tmux?.enabled ?? false,
        layout: pluginConfig.tmux?.layout ?? "main-vertical",
        main_pane_size: pluginConfig.tmux?.main_pane_size ?? 60,
        main_pane_min_width: pluginConfig.tmux?.main_pane_min_width ?? 120,
        agent_pane_min_width: pluginConfig.tmux?.agent_pane_min_width ?? 40,
    };
    const modelCacheState = createModelCacheState();
    const managers = createManagers({
        ctx,
        pluginConfig,
        tmuxConfig,
        modelCacheState,
        backgroundNotificationHookEnabled: isHookEnabled("background-notification"),
    });
    const toolsResult = await createTools({
        ctx,
        pluginConfig,
        managers,
    });
    const hooks = createHooks({
        ctx,
        pluginConfig,
        modelCacheState,
        backgroundManager: managers.backgroundManager,
        isHookEnabled,
        safeHookEnabled,
        mergedSkills: toolsResult.mergedSkills,
        availableSkills: toolsResult.availableSkills,
    });
    const pluginInterface = createPluginInterface({
        ctx,
        pluginConfig,
        firstMessageVariantGate,
        managers,
        hooks,
        tools: toolsResult.filteredTools,
    });
    const baseChatMessage = pluginInterface["chat.message"];
    const baseEvent = pluginInterface.event;
    const baseToolExecuteBefore = pluginInterface["tool.execute.before"];
    const baseToolExecuteAfter = pluginInterface["tool.execute.after"];
    return {
        ...pluginInterface,
        "chat.message": async (input, output) => {
            await baseChatMessage?.(input, output);
            await downstreamHooks.runChatMessage(input, output);
        },
        UserPromptSubmit: async (input, output) => {
            await downstreamHooks.runUserPromptSubmit(input, output);
        },
        event: async (input) => {
            await baseEvent?.(input);
            const eventType = input?.event?.type;
            if (eventType === "session.created") {
                const props = input.event?.properties;
                const sessionInfo = props?.info;
                if (sessionInfo?.id) {
                    void repairMisbucketedSessionMetadata({
                        directory: ctx.directory,
                        sessionID: sessionInfo.id,
                    })
                        .then((result) => {
                        if (result.repaired > 0) {
                            log("[session-bucket-repair] session.created repair completed", {
                                sessionID: sessionInfo.id,
                                ...result,
                            });
                        }
                    })
                        .catch((error) => {
                        log("[session-bucket-repair] session.created repair failed", {
                            sessionID: sessionInfo.id,
                            error: error instanceof Error ? error.message : String(error),
                        });
                    });
                }
            }
            await downstreamHooks.runEvent(input);
        },
        "tool.execute.before": async (input, output) => {
            log("[OhMyOpenCodePlugin] tool.execute.before", {
                tool: input.tool,
                sessionID: input.sessionID,
                args: output.args,
            });
            await baseToolExecuteBefore?.(input, output);
            await downstreamHooks.runToolExecuteBefore(input, output);
        },
        "tool.execute.after": async (input, output) => {
            await baseToolExecuteAfter?.(input, output);
            if (!output)
                return;
            await downstreamHooks.runToolExecuteAfter(input, output);
        },
        "experimental.session.compacting": async (_input, output) => {
            await hooks.compactionTodoPreserver?.capture(_input.sessionID);
            await hooks.claudeCodeHooks?.["experimental.session.compacting"]?.(_input, output);
            if (hooks.compactionContextInjector) {
                output.context.push(hooks.compactionContextInjector(_input.sessionID));
            }
            await downstreamHooks.runExperimentalSessionCompacting(_input, output);
        },
    };
};
export default OhMyOpenCodePlugin;
