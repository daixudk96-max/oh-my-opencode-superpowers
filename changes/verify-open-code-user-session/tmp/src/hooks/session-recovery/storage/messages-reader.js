import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getMessageDir } from "./message-dir";
import { isSqliteBackend, normalizeSDKResponse } from "../../../shared";
import { isRecord } from "../../../shared/record-type-guard";
function normalizeSDKMessage(sessionID, value) {
    if (!isRecord(value))
        return null;
    if (typeof value.id !== "string")
        return null;
    const roleValue = value.role;
    const role = roleValue === "assistant" ? "assistant" : "user";
    const created = isRecord(value.time) && typeof value.time.created === "number"
        ? value.time.created
        : 0;
    return {
        id: value.id,
        sessionID,
        role,
        time: { created },
    };
}
export function readMessages(sessionID) {
    if (isSqliteBackend())
        return [];
    const messageDir = getMessageDir(sessionID);
    if (!messageDir || !existsSync(messageDir))
        return [];
    const messages = [];
    for (const file of readdirSync(messageDir)) {
        if (!file.endsWith(".json"))
            continue;
        try {
            const content = readFileSync(join(messageDir, file), "utf-8");
            messages.push(JSON.parse(content));
        }
        catch {
            continue;
        }
    }
    return messages.sort((a, b) => {
        const aTime = a.time?.created ?? 0;
        const bTime = b.time?.created ?? 0;
        if (aTime !== bTime)
            return aTime - bTime;
        return a.id.localeCompare(b.id);
    });
}
export async function readMessagesFromSDK(client, sessionID) {
    try {
        const response = await client.session.messages({ path: { id: sessionID } });
        const data = normalizeSDKResponse(response, [], {
            preferResponseOnMissingData: true,
        });
        if (!Array.isArray(data))
            return [];
        const messages = data
            .map((msg) => normalizeSDKMessage(sessionID, msg))
            .filter((msg) => msg !== null);
        return messages.sort((a, b) => {
            const aTime = a.time?.created ?? 0;
            const bTime = b.time?.created ?? 0;
            if (aTime !== bTime)
                return aTime - bTime;
            return a.id.localeCompare(b.id);
        });
    }
    catch {
        return [];
    }
}
