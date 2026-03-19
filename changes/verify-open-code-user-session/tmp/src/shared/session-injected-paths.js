import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync, } from "node:fs";
import { join } from "node:path";
export function createInjectedPathsStorage(storageDir) {
    const getStoragePath = (sessionID) => join(storageDir, `${sessionID}.json`);
    const loadInjectedPaths = (sessionID) => {
        const filePath = getStoragePath(sessionID);
        if (!existsSync(filePath))
            return new Set();
        try {
            const content = readFileSync(filePath, "utf-8");
            const data = JSON.parse(content);
            return new Set(data.injectedPaths);
        }
        catch {
            return new Set();
        }
    };
    const saveInjectedPaths = (sessionID, paths) => {
        if (!existsSync(storageDir)) {
            mkdirSync(storageDir, { recursive: true });
        }
        const data = {
            sessionID,
            injectedPaths: [...paths],
            updatedAt: Date.now(),
        };
        writeFileSync(getStoragePath(sessionID), JSON.stringify(data, null, 2));
    };
    const clearInjectedPaths = (sessionID) => {
        const filePath = getStoragePath(sessionID);
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }
    };
    return {
        loadInjectedPaths,
        saveInjectedPaths,
        clearInjectedPaths,
    };
}
