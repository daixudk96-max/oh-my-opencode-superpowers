async function enforceMainPane(windowState, config, deps) {
    if (!windowState.mainPane)
        return;
    await deps.enforceMainPaneWidth(windowState.mainPane.paneId, windowState.windowWidth, config.main_pane_size);
}
export async function executeActionWithDeps(action, ctx, deps) {
    if (action.type === "close") {
        const success = await deps.closeTmuxPane(action.paneId);
        if (success) {
            await enforceMainPane(ctx.windowState, ctx.config, deps);
        }
        return { success };
    }
    if (action.type === "replace") {
        const result = await deps.replaceTmuxPane(action.paneId, action.newSessionId, action.description, ctx.config, ctx.serverUrl);
        return {
            success: result.success,
            paneId: result.paneId,
        };
    }
    const result = await deps.spawnTmuxPane(action.sessionId, action.description, ctx.config, ctx.serverUrl, action.targetPaneId, action.splitDirection);
    if (result.success) {
        await enforceMainPane(ctx.windowState, ctx.config, deps);
    }
    return {
        success: result.success,
        paneId: result.paneId,
    };
}
