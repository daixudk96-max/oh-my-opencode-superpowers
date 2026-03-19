import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PART_STORAGE } from "../constants";
import { isSqliteBackend } from "../../../shared";
import { isRecord } from "../../../shared/record-type-guard";
export function readParts(messageID) {
    if (isSqliteBackend())
        return [];
    const partDir = join(PART_STORAGE, messageID);
    if (!existsSync(partDir))
        return [];
    const parts = [];
    for (const file of readdirSync(partDir)) {
        if (!file.endsWith(".json"))
            continue;
        try {
            const content = readFileSync(join(partDir, file), "utf-8");
            parts.push(JSON.parse(content));
        }
        catch {
            continue;
        }
    }
    return parts;
}
export async function readPartsFromSDK(client, sessionID, messageID) {
    try {
        const response = await client.session.message({
            path: { id: sessionID, messageID },
        });
        const data = response.data;
        if (!isRecord(data))
            return [];
        const rawParts = data.parts;
        if (!Array.isArray(rawParts))
            return [];
        return rawParts
            .map((part) => {
            if (!isRecord(part) || typeof part.id !== "string" || typeof part.type !== "string")
                return null;
            return { ...part, sessionID, messageID };
        })
            .filter((part) => part !== null);
    }
    catch {
        return [];
    }
}
