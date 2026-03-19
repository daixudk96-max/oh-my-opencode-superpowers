import { spawn } from "bun";
import { getTmuxPath } from "../../../tools/interactive-bash/tmux-path-resolver";
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function calculateMainPaneWidth(windowWidth, options) {
    const dividerWidth = 1;
    const sizePercent = clamp(options?.mainPaneSize ?? 50, 20, 80);
    const minMainPaneWidth = options?.mainPaneMinWidth ?? 0;
    const minAgentPaneWidth = options?.agentPaneMinWidth ?? 0;
    const desiredMainPaneWidth = Math.floor((windowWidth - dividerWidth) * (sizePercent / 100));
    const maxMainPaneWidth = Math.max(0, windowWidth - dividerWidth - minAgentPaneWidth);
    return clamp(Math.max(desiredMainPaneWidth, minMainPaneWidth), 0, maxMainPaneWidth);
}
export async function applyLayout(tmux, layout, mainPaneSize, deps) {
    const spawnCommand = deps?.spawnCommand ?? spawn;
    const layoutProc = spawnCommand([tmux, "select-layout", layout], {
        stdout: "ignore",
        stderr: "ignore",
    });
    await layoutProc.exited;
    if (layout.startsWith("main-")) {
        const dimension = layout === "main-horizontal" ? "main-pane-height" : "main-pane-width";
        const sizeProc = spawnCommand([tmux, "set-window-option", dimension, `${mainPaneSize}%`], { stdout: "ignore", stderr: "ignore" });
        await sizeProc.exited;
    }
}
export async function enforceMainPaneWidth(mainPaneId, windowWidth, mainPaneSizeOrOptions) {
    const { log } = await import("../../logger");
    const tmux = await getTmuxPath();
    if (!tmux)
        return;
    const options = typeof mainPaneSizeOrOptions === "number"
        ? { mainPaneSize: mainPaneSizeOrOptions }
        : mainPaneSizeOrOptions ?? {};
    const mainWidth = calculateMainPaneWidth(windowWidth, options);
    const proc = spawn([tmux, "resize-pane", "-t", mainPaneId, "-x", String(mainWidth)], {
        stdout: "ignore",
        stderr: "ignore",
    });
    await proc.exited;
    log("[enforceMainPaneWidth] main pane resized", {
        mainPaneId,
        mainWidth,
        windowWidth,
        mainPaneSize: options?.mainPaneSize,
        mainPaneMinWidth: options?.mainPaneMinWidth,
        agentPaneMinWidth: options?.agentPaneMinWidth,
    });
}
