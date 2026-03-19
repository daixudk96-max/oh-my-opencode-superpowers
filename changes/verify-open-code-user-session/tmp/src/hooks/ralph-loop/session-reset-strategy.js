import { isRecord } from "../../shared/record-type-guard";
import { log } from "../../shared/logger";
export async function createIterationSession(ctx, parentSessionID, directory) {
    const createResult = await ctx.client.session.create({
        body: {
            parentID: parentSessionID,
            title: "Ralph Loop Iteration",
        },
        query: { directory },
    });
    if (createResult.error || !createResult.data?.id) {
        log("[ralph-loop] Failed to create iteration session", {
            parentSessionID,
            error: String(createResult.error ?? "No session ID returned"),
        });
        return null;
    }
    return createResult.data.id;
}
export async function selectSessionInTui(client, sessionID) {
    const selectSession = getSelectSessionApi(client);
    if (!selectSession) {
        return false;
    }
    try {
        await selectSession({ body: { sessionID } });
        return true;
    }
    catch (error) {
        log("[ralph-loop] Failed to select session in TUI", {
            sessionID,
            error: String(error),
        });
        return false;
    }
}
function getSelectSessionApi(client) {
    if (!isRecord(client)) {
        return null;
    }
    const clientRecord = client;
    const tuiValue = clientRecord.tui;
    if (!isRecord(tuiValue)) {
        return null;
    }
    const selectSessionValue = tuiValue.selectSession;
    if (typeof selectSessionValue !== "function") {
        return null;
    }
    return selectSessionValue.bind(tuiValue);
}
