import { existsSync } from "fs";
import { findSgCliPathSync, getSgCliPath, setSgCliPath } from "./constants";
import { ensureAstGrepBinary } from "./downloader";
let resolvedCliPath = null;
let initPromise = null;
export async function getAstGrepPath() {
    if (resolvedCliPath !== null && existsSync(resolvedCliPath)) {
        return resolvedCliPath;
    }
    if (initPromise) {
        return initPromise;
    }
    initPromise = (async () => {
        const syncPath = findSgCliPathSync();
        if (syncPath && existsSync(syncPath)) {
            resolvedCliPath = syncPath;
            setSgCliPath(syncPath);
            return syncPath;
        }
        const downloadedPath = await ensureAstGrepBinary();
        if (downloadedPath) {
            resolvedCliPath = downloadedPath;
            setSgCliPath(downloadedPath);
            return downloadedPath;
        }
        return null;
    })();
    return initPromise;
}
export function startBackgroundInit() {
    if (!initPromise) {
        initPromise = getAstGrepPath();
        initPromise.catch(() => { });
    }
}
export function isCliAvailable() {
    const path = findSgCliPathSync();
    return path !== null && existsSync(path);
}
export async function ensureCliAvailable() {
    const path = await getAstGrepPath();
    return path !== null && existsSync(path);
}
export function getResolvedSgCliPath() {
    const path = getSgCliPath();
    if (path && existsSync(path))
        return path;
    return null;
}
