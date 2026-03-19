import { existsSync, realpathSync } from "fs";
import { basename, dirname, isAbsolute, join, normalize, relative, resolve } from "path";
import { log } from "../../shared";
const MAX_TRACKED_SESSIONS = 256;
export const MAX_TRACKED_PATHS_PER_SESSION = 1024;
const BLOCK_MESSAGE = "File already exists. Use edit tool instead.";
function asRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }
    return value;
}
function getPathFromArgs(args) {
    return args?.filePath ?? args?.path ?? args?.file_path;
}
function resolveInputPath(ctx, inputPath) {
    return normalize(isAbsolute(inputPath) ? inputPath : resolve(ctx.directory, inputPath));
}
function isPathInsideDirectory(pathToCheck, directory) {
    const relativePath = relative(directory, pathToCheck);
    return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}
function toCanonicalPath(absolutePath) {
    let canonicalPath = absolutePath;
    if (existsSync(absolutePath)) {
        try {
            canonicalPath = realpathSync.native(absolutePath);
        }
        catch {
            canonicalPath = absolutePath;
        }
    }
    else {
        const absoluteDir = dirname(absolutePath);
        const resolvedDir = existsSync(absoluteDir) ? realpathSync.native(absoluteDir) : absoluteDir;
        canonicalPath = join(resolvedDir, basename(absolutePath));
    }
    // Preserve canonical casing from the filesystem to avoid collapsing distinct
    // files on case-sensitive volumes (supported on all major OSes).
    return normalize(canonicalPath);
}
function isOverwriteEnabled(value) {
    if (value === true) {
        return true;
    }
    if (typeof value === "string") {
        return value.toLowerCase() === "true";
    }
    return false;
}
export function createWriteExistingFileGuardHook(ctx) {
    const readPermissionsBySession = new Map();
    const sessionLastAccess = new Map();
    const canonicalSessionRoot = toCanonicalPath(resolveInputPath(ctx, ctx.directory));
    const touchSession = (sessionID) => {
        sessionLastAccess.set(sessionID, Date.now());
    };
    const evictLeastRecentlyUsedSession = () => {
        let oldestSessionID;
        let oldestSeen = Number.POSITIVE_INFINITY;
        for (const [sessionID, lastSeen] of sessionLastAccess.entries()) {
            if (lastSeen < oldestSeen) {
                oldestSeen = lastSeen;
                oldestSessionID = sessionID;
            }
        }
        if (!oldestSessionID) {
            return;
        }
        readPermissionsBySession.delete(oldestSessionID);
        sessionLastAccess.delete(oldestSessionID);
    };
    const ensureSessionReadSet = (sessionID) => {
        let readSet = readPermissionsBySession.get(sessionID);
        if (!readSet) {
            if (readPermissionsBySession.size >= MAX_TRACKED_SESSIONS) {
                evictLeastRecentlyUsedSession();
            }
            readSet = new Set();
            readPermissionsBySession.set(sessionID, readSet);
        }
        touchSession(sessionID);
        return readSet;
    };
    const trimSessionReadSet = (readSet) => {
        while (readSet.size > MAX_TRACKED_PATHS_PER_SESSION) {
            const oldestPath = readSet.values().next().value;
            if (!oldestPath) {
                return;
            }
            readSet.delete(oldestPath);
        }
    };
    const registerReadPermission = (sessionID, canonicalPath) => {
        const readSet = ensureSessionReadSet(sessionID);
        if (readSet.has(canonicalPath)) {
            readSet.delete(canonicalPath);
        }
        readSet.add(canonicalPath);
        trimSessionReadSet(readSet);
    };
    const consumeReadPermission = (sessionID, canonicalPath) => {
        const readSet = readPermissionsBySession.get(sessionID);
        if (!readSet || !readSet.has(canonicalPath)) {
            return false;
        }
        readSet.delete(canonicalPath);
        touchSession(sessionID);
        return true;
    };
    const invalidateOtherSessions = (canonicalPath, writingSessionID) => {
        for (const [sessionID, readSet] of readPermissionsBySession.entries()) {
            if (writingSessionID && sessionID === writingSessionID) {
                continue;
            }
            readSet.delete(canonicalPath);
        }
    };
    return {
        "tool.execute.before": async (input, output) => {
            const toolName = input.tool?.toLowerCase();
            if (toolName !== "write" && toolName !== "read") {
                return;
            }
            const argsRecord = asRecord(output.args);
            const args = argsRecord;
            const filePath = getPathFromArgs(args);
            if (!filePath) {
                return;
            }
            const resolvedPath = resolveInputPath(ctx, filePath);
            const canonicalPath = toCanonicalPath(resolvedPath);
            const isInsideSessionDirectory = isPathInsideDirectory(canonicalPath, canonicalSessionRoot);
            if (!isInsideSessionDirectory) {
                return;
            }
            if (toolName === "read") {
                if (!existsSync(resolvedPath) || !input.sessionID) {
                    return;
                }
                registerReadPermission(input.sessionID, canonicalPath);
                return;
            }
            const overwriteEnabled = isOverwriteEnabled(args?.overwrite);
            if (argsRecord && "overwrite" in argsRecord) {
                // Intentionally mutate output args so overwrite bypass remains hook-only.
                delete argsRecord.overwrite;
            }
            if (!existsSync(resolvedPath)) {
                return;
            }
            const isSisyphusPath = /[/\\]\.sisyphus[/\\]/.test(canonicalPath) || /[/\\]changes[/\\]/.test(canonicalPath); // TDD-EXEMPT: path migration fix
            if (isSisyphusPath) {
                log("[write-existing-file-guard] Allowing .sisyphus/** or changes/** overwrite", {
                    sessionID: input.sessionID,
                    filePath,
                });
                invalidateOtherSessions(canonicalPath, input.sessionID);
                return;
            }
            if (overwriteEnabled) {
                log("[write-existing-file-guard] Allowing overwrite flag bypass", {
                    sessionID: input.sessionID,
                    filePath,
                    resolvedPath,
                });
                invalidateOtherSessions(canonicalPath, input.sessionID);
                return;
            }
            if (input.sessionID && consumeReadPermission(input.sessionID, canonicalPath)) {
                log("[write-existing-file-guard] Allowing overwrite after read", {
                    sessionID: input.sessionID,
                    filePath,
                    resolvedPath,
                });
                invalidateOtherSessions(canonicalPath, input.sessionID);
                return;
            }
            log("[write-existing-file-guard] Blocking write to existing file", {
                sessionID: input.sessionID,
                filePath,
                resolvedPath,
            });
            throw new Error("File already exists. Use edit tool instead.");
        },
        event: async ({ event }) => {
            if (event.type !== "session.deleted") {
                return;
            }
            const props = event.properties;
            const sessionID = props?.info?.id;
            if (!sessionID) {
                return;
            }
            readPermissionsBySession.delete(sessionID);
            sessionLastAccess.delete(sessionID);
        },
    };
}
