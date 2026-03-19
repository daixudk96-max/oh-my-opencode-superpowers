import { BackgroundManager } from "./features/background-agent";
import { SkillMcpManager } from "./features/skill-mcp-manager";
import { initTaskToastManager } from "./features/task-toast-manager";
import { TmuxSessionManager } from "./features/tmux-subagent";
import { createConfigHandler } from "./plugin-handlers";
import { log } from "./shared";
export function createManagers(args) {
    const { ctx, pluginConfig, tmuxConfig, modelCacheState, backgroundNotificationHookEnabled } = args;
    const tmuxSessionManager = new TmuxSessionManager(ctx, tmuxConfig);
    const backgroundManager = new BackgroundManager(ctx, pluginConfig.background_task, {
        tmuxConfig,
        onSubagentSessionCreated: async (event) => {
            log("[index] onSubagentSessionCreated callback received", {
                sessionID: event.sessionID,
                parentID: event.parentID,
                title: event.title,
            });
            await tmuxSessionManager.onSessionCreated({
                type: "session.created",
                properties: {
                    info: {
                        id: event.sessionID,
                        parentID: event.parentID,
                        title: event.title,
                    },
                },
            });
            log("[index] onSubagentSessionCreated callback completed");
        },
        onShutdown: () => {
            tmuxSessionManager.cleanup().catch((error) => {
                log("[index] tmux cleanup error during shutdown:", error);
            });
        },
        enableParentSessionNotifications: backgroundNotificationHookEnabled,
    });
    initTaskToastManager(ctx.client);
    const skillMcpManager = new SkillMcpManager();
    const configHandler = createConfigHandler({
        ctx: { directory: ctx.directory, client: ctx.client },
        pluginConfig,
        modelCacheState,
    });
    return {
        tmuxSessionManager,
        backgroundManager,
        skillMcpManager,
        configHandler,
    };
}
