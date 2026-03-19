import { MIN_PANE_HEIGHT, MIN_PANE_WIDTH } from "./types";
import { DIVIDER_SIZE, MAX_GRID_SIZE, computeAgentAreaWidth, } from "./tmux-grid-constants";
function resolveMinPaneWidth(options) {
    if (typeof options === "number") {
        return Math.max(1, options);
    }
    if (options && typeof options.agentPaneWidth === "number") {
        return Math.max(1, options.agentPaneWidth);
    }
    return MIN_PANE_WIDTH;
}
function resolveAgentAreaWidth(windowWidth, options) {
    if (typeof options === "number") {
        return computeAgentAreaWidth(windowWidth);
    }
    return computeAgentAreaWidth(windowWidth, options);
}
export function calculateCapacity(windowWidth, windowHeight, options, mainPaneWidth) {
    const availableWidth = typeof mainPaneWidth === "number"
        ? Math.max(0, windowWidth - mainPaneWidth - DIVIDER_SIZE)
        : resolveAgentAreaWidth(windowWidth, options);
    const minPaneWidth = resolveMinPaneWidth(options);
    const cols = Math.min(MAX_GRID_SIZE, Math.max(0, Math.floor((availableWidth + DIVIDER_SIZE) / (minPaneWidth + DIVIDER_SIZE))));
    const rows = Math.min(MAX_GRID_SIZE, Math.max(0, Math.floor((windowHeight + DIVIDER_SIZE) / (MIN_PANE_HEIGHT + DIVIDER_SIZE))));
    return { cols, rows, total: cols * rows };
}
export function computeGridPlan(windowWidth, windowHeight, paneCount, options, mainPaneWidth) {
    const capacity = calculateCapacity(windowWidth, windowHeight, options, mainPaneWidth);
    const { cols: maxCols, rows: maxRows } = capacity;
    if (maxCols === 0 || maxRows === 0 || paneCount === 0) {
        return { cols: 1, rows: 1, slotWidth: 0, slotHeight: 0 };
    }
    let bestCols = 1;
    let bestRows = 1;
    let bestArea = Infinity;
    for (let rows = 1; rows <= maxRows; rows++) {
        for (let cols = 1; cols <= maxCols; cols++) {
            if (cols * rows < paneCount)
                continue;
            const area = cols * rows;
            if (area < bestArea || (area === bestArea && rows < bestRows)) {
                bestCols = cols;
                bestRows = rows;
                bestArea = area;
            }
        }
    }
    const availableWidth = typeof mainPaneWidth === "number"
        ? Math.max(0, windowWidth - mainPaneWidth - DIVIDER_SIZE)
        : resolveAgentAreaWidth(windowWidth, options);
    const slotWidth = Math.floor(availableWidth / bestCols);
    const slotHeight = Math.floor(windowHeight / bestRows);
    return { cols: bestCols, rows: bestRows, slotWidth, slotHeight };
}
export function mapPaneToSlot(pane, plan, mainPaneWidth) {
    const rightAreaX = mainPaneWidth;
    const relativeX = Math.max(0, pane.left - rightAreaX);
    const relativeY = pane.top;
    const col = plan.slotWidth > 0
        ? Math.min(plan.cols - 1, Math.floor(relativeX / plan.slotWidth))
        : 0;
    const row = plan.slotHeight > 0
        ? Math.min(plan.rows - 1, Math.floor(relativeY / plan.slotHeight))
        : 0;
    return { row, col };
}
