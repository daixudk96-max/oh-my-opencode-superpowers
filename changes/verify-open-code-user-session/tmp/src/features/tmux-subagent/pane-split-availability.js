import { DIVIDER_SIZE, MAX_COLS, MAX_ROWS, MIN_SPLIT_HEIGHT, } from "./tmux-grid-constants";
import { MIN_PANE_WIDTH } from "./types";
function getMinSplitWidth(minPaneWidth) {
    const width = Math.max(1, minPaneWidth ?? MIN_PANE_WIDTH);
    return 2 * width + DIVIDER_SIZE;
}
export function getColumnCount(paneCount) {
    if (paneCount <= 0)
        return 1;
    return Math.min(MAX_COLS, Math.max(1, Math.ceil(paneCount / MAX_ROWS)));
}
export function getColumnWidth(agentAreaWidth, paneCount) {
    const cols = getColumnCount(paneCount);
    const dividersWidth = (cols - 1) * DIVIDER_SIZE;
    return Math.floor((agentAreaWidth - dividersWidth) / cols);
}
export function isSplittableAtCount(agentAreaWidth, paneCount, minPaneWidth) {
    const columnWidth = getColumnWidth(agentAreaWidth, paneCount);
    return columnWidth >= getMinSplitWidth(minPaneWidth);
}
export function findMinimalEvictions(agentAreaWidth, currentCount, minPaneWidth) {
    for (let k = 1; k <= currentCount; k++) {
        if (isSplittableAtCount(agentAreaWidth, currentCount - k, minPaneWidth)) {
            return k;
        }
    }
    return null;
}
export function canSplitPane(pane, direction, minPaneWidth) {
    if (direction === "-h") {
        return pane.width >= getMinSplitWidth(minPaneWidth);
    }
    return pane.height >= MIN_SPLIT_HEIGHT;
}
export function canSplitPaneAnyDirection(pane, minPaneWidth) {
    return pane.width >= getMinSplitWidth(minPaneWidth) || pane.height >= MIN_SPLIT_HEIGHT;
}
export function getBestSplitDirection(pane, minPaneWidth) {
    const canH = pane.width >= getMinSplitWidth(minPaneWidth);
    const canV = pane.height >= MIN_SPLIT_HEIGHT;
    if (!canH && !canV)
        return null;
    if (canH && !canV)
        return "-h";
    if (!canH && canV)
        return "-v";
    return pane.width >= pane.height ? "-h" : "-v";
}
