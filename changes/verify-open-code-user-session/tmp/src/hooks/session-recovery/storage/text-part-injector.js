import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PART_STORAGE } from "../constants";
import { generatePartId } from "./part-id";
import { log, isSqliteBackend, patchPart } from "../../../shared";
export function injectTextPart(sessionID, messageID, text) {
    if (isSqliteBackend()) {
        log("[session-recovery] Disabled on SQLite backend: injectTextPart (use async variant)");
        return false;
    }
    const partDir = join(PART_STORAGE, messageID);
    if (!existsSync(partDir)) {
        mkdirSync(partDir, { recursive: true });
    }
    const partId = generatePartId();
    const part = {
        id: partId,
        sessionID,
        messageID,
        type: "text",
        text,
        synthetic: true,
    };
    try {
        writeFileSync(join(partDir, `${partId}.json`), JSON.stringify(part, null, 2));
        return true;
    }
    catch {
        return false;
    }
}
export async function injectTextPartAsync(client, sessionID, messageID, text) {
    const partId = generatePartId();
    const part = {
        id: partId,
        sessionID,
        messageID,
        type: "text",
        text,
        synthetic: true,
    };
    try {
        return await patchPart(client, sessionID, messageID, partId, part);
    }
    catch (error) {
        log("[session-recovery] injectTextPartAsync failed", { error: String(error) });
        return false;
    }
}
