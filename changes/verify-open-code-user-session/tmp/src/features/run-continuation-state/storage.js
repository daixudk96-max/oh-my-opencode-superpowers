import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTINUATION_MARKER_DIR } from "./constants";
function getMarkerPath(directory, sessionID) {
    return join(directory, CONTINUATION_MARKER_DIR, `${sessionID}.json`);
}
export function readContinuationMarker(directory, sessionID) {
    const markerPath = getMarkerPath(directory, sessionID);
    if (!existsSync(markerPath))
        return null;
    try {
        const raw = readFileSync(markerPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
export function setContinuationMarkerSource(directory, sessionID, source, state, reason) {
    const now = new Date().toISOString();
    const existing = readContinuationMarker(directory, sessionID);
    const next = {
        sessionID,
        updatedAt: now,
        sources: {
            ...(existing?.sources ?? {}),
            [source]: {
                state,
                ...(reason ? { reason } : {}),
                updatedAt: now,
            },
        },
    };
    const markerPath = getMarkerPath(directory, sessionID);
    mkdirSync(join(directory, CONTINUATION_MARKER_DIR), { recursive: true });
    writeFileSync(markerPath, JSON.stringify(next, null, 2), "utf-8");
    return next;
}
export function clearContinuationMarker(directory, sessionID) {
    const markerPath = getMarkerPath(directory, sessionID);
    if (!existsSync(markerPath))
        return;
    try {
        rmSync(markerPath);
    }
    catch {
    }
}
export function isContinuationMarkerActive(marker) {
    if (!marker)
        return false;
    return Object.values(marker.sources).some((entry) => entry?.state === "active");
}
export function getActiveContinuationMarkerReason(marker) {
    if (!marker)
        return null;
    const active = Object.entries(marker.sources).find(([, entry]) => entry?.state === "active");
    if (!active || !active[1])
        return null;
    const [source, entry] = active;
    return entry.reason ?? `${source} continuation is active`;
}
