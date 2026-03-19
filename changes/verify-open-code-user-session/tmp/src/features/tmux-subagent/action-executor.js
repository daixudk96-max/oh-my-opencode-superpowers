import { applyLayout, spawnTmuxPane, closeTmuxPane, enforceMainPaneWidth, replaceTmuxPane, } from "../../shared/tmux";
import { getTmuxPath } from "../../tools/interactive-bash/tmux-path-resolver";
import { queryWindowState } from "./pane-state-querier";
import { log } from "../../shared";
async function enforceMainPane(windowState, config) {
    if (!windowState.mainPane)
        return;
    await enforceMainPaneWidth(windowState.mainPane.paneId, windowState.windowWidth, {
        mainPaneSize: config.main_pane_size,
        mainPaneMinWidth: config.main_pane_min_width,
        agentPaneMinWidth: config.agent_pane_min_width,
    });
}
async function enforceLayoutAndMainPane(ctx) {
    const sourcePaneId = ctx.sourcePaneId;
    if (!sourcePaneId) {
        await enforceMainPane(ctx.windowState, ctx.config);
        return;
    }
    const latestState = await queryWindowState(sourcePaneId);
    if (!latestState?.mainPane) {
        await enforceMainPane(ctx.windowState, ctx.config);
        return;
    }
    const tmux = await getTmuxPath();
    if (tmux) {
        await applyLayout(tmux, ctx.config.layout, ctx.config.main_pane_size);
    }
    await enforceMainPane(latestState, ctx.config);
}
export async function executeAction(action, ctx) {
    if (action.type === "close") {
        const success = await closeTmuxPane(action.paneId);
        if (success) {
            await enforceLayoutAndMainPane(ctx);
        }
        return { success };
    }
    if (action.type === "replace") {
        const result = await replaceTmuxPane(action.paneId, action.newSessionId, action.description, ctx.config, ctx.serverUrl);
        if (result.success) {
            await enforceLayoutAndMainPane(ctx);
        }
        return {
            success: result.success,
            paneId: result.paneId,
        };
    }
    const result = await spawnTmuxPane(action.sessionId, action.description, ctx.config, ctx.serverUrl, action.targetPaneId, action.splitDirection);
    if (result.success) {
        await enforceLayoutAndMainPane(ctx);
    }
    return {
        success: result.success,
        paneId: result.paneId,
    };
}
export async function executeActions(actions, ctx) {
    const results = [];
    let spawnedPaneId;
    for (const action of actions) {
        log("[action-executor] executing", { type: action.type });
        const result = await executeAction(action, ctx);
        results.push({ action, result });
        if (!result.success) {
            log("[action-executor] action failed", { type: action.type, error: result.error });
            return { success: false, results };
        }
        if ((action.type === "spawn" || action.type === "replace") && result.paneId) {
            spawnedPaneId = result.paneId;
        }
    }
    return { success: true, spawnedPaneId, results };
}
