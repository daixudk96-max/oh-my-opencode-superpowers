import { normalizeSDKResponse } from "../../shared";
export async function fetchSyncResult(client, sessionID, anchorMessageCount) {
    const messagesResult = await client.session.messages({
        path: { id: sessionID },
    });
    if (messagesResult.error) {
        return { ok: false, error: `Error fetching result: ${messagesResult.error}\n\nSession ID: ${sessionID}` };
    }
    const messages = normalizeSDKResponse(messagesResult, [], {
        preferResponseOnMissingData: true,
    });
    const messagesAfterAnchor = anchorMessageCount !== undefined ? messages.slice(anchorMessageCount) : messages;
    if (anchorMessageCount !== undefined && messagesAfterAnchor.length === 0) {
        return {
            ok: false,
            error: `Session completed but no new response was generated. The model may have failed silently.\n\nSession ID: ${sessionID}`,
        };
    }
    const assistantMessages = messagesAfterAnchor
        .filter((m) => m.info?.role === "assistant")
        .sort((a, b) => (b.info?.time?.created ?? 0) - (a.info?.time?.created ?? 0));
    const lastMessage = assistantMessages[0];
    if (anchorMessageCount !== undefined && !lastMessage) {
        return {
            ok: false,
            error: `Session completed but no new response was generated. The model may have failed silently.\n\nSession ID: ${sessionID}`,
        };
    }
    if (!lastMessage) {
        return { ok: false, error: `No assistant response found.\n\nSession ID: ${sessionID}` };
    }
    // Search assistant messages (newest first) for one with text/reasoning content.
    // The last assistant message may only contain tool calls with no text.
    let textContent = "";
    for (const msg of assistantMessages) {
        const textParts = msg.parts?.filter((p) => p.type === "text" || p.type === "reasoning") ?? [];
        const content = textParts.map((p) => p.text ?? "").filter(Boolean).join("\n");
        if (content) {
            textContent = content;
            break;
        }
    }
    return { ok: true, textContent };
}
