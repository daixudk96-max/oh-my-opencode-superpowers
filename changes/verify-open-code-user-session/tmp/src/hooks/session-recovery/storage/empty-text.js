import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PART_STORAGE } from "../constants";
import { readMessages } from "./messages-reader";
import { readParts } from "./parts-reader";
import { log, isSqliteBackend, patchPart } from "../../../shared";
import { normalizeSDKResponse } from "../../../shared";
export function replaceEmptyTextParts(messageID, replacementText) {
    if (isSqliteBackend()) {
        log("[session-recovery] Disabled on SQLite backend: replaceEmptyTextParts (use async variant)");
        return false;
    }
    const partDir = join(PART_STORAGE, messageID);
    if (!existsSync(partDir))
        return false;
    let anyReplaced = false;
    for (const file of readdirSync(partDir)) {
        if (!file.endsWith(".json"))
            continue;
        try {
            const filePath = join(partDir, file);
            const content = readFileSync(filePath, "utf-8");
            const part = JSON.parse(content);
            if (part.type === "text") {
                const textPart = part;
                if (!textPart.text?.trim()) {
                    textPart.text = replacementText;
                    textPart.synthetic = true;
                    writeFileSync(filePath, JSON.stringify(textPart, null, 2));
                    anyReplaced = true;
                }
            }
        }
        catch {
            continue;
        }
    }
    return anyReplaced;
}
export async function replaceEmptyTextPartsAsync(client, sessionID, messageID, replacementText) {
    try {
        const response = await client.session.messages({ path: { id: sessionID } });
        const messages = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
        const targetMsg = messages.find((m) => m.info?.id === messageID);
        if (!targetMsg?.parts)
            return false;
        let anyReplaced = false;
        for (const part of targetMsg.parts) {
            if (part.type === "text" && !part.text?.trim() && part.id) {
                const patched = await patchPart(client, sessionID, messageID, part.id, {
                    ...part,
                    text: replacementText,
                    synthetic: true,
                });
                if (patched)
                    anyReplaced = true;
            }
        }
        return anyReplaced;
    }
    catch (error) {
        log("[session-recovery] replaceEmptyTextPartsAsync failed", { error: String(error) });
        return false;
    }
}
export function findMessagesWithEmptyTextParts(sessionID) {
    const messages = readMessages(sessionID);
    const result = [];
    for (const msg of messages) {
        const parts = readParts(msg.id);
        const hasEmptyTextPart = parts.some((part) => {
            if (part.type !== "text")
                return false;
            const textPart = part;
            return !textPart.text?.trim();
        });
        if (hasEmptyTextPart) {
            result.push(msg.id);
        }
    }
    return result;
}
export async function findMessagesWithEmptyTextPartsFromSDK(client, sessionID) {
    try {
        const response = await client.session.messages({ path: { id: sessionID } });
        const messages = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
        const result = [];
        for (const msg of messages) {
            if (!msg.parts || !msg.info?.id)
                continue;
            const hasEmpty = msg.parts.some((p) => p.type === "text" && !p.text?.trim());
            if (hasEmpty)
                result.push(msg.info.id);
        }
        return result;
    }
    catch {
        return [];
    }
}
