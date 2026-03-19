export function isInsideTmux() {
    return Boolean(process.env.TMUX);
}
export function getCurrentPaneId() {
    return process.env.TMUX_PANE;
}
