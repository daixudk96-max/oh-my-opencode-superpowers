import { log } from "../../shared";
import { getMainSessionID } from "../claude-code-session-state";
export function injectPendingContext(collector, sessionID, parts) {
    if (!collector.hasPending(sessionID)) {
        return { injected: false, contextLength: 0 };
    }
    const textPartIndex = parts.findIndex((p) => p.type === "text" && p.text !== undefined);
    if (textPartIndex === -1) {
        return { injected: false, contextLength: 0 };
    }
    const pending = collector.consume(sessionID);
    const originalText = parts[textPartIndex].text ?? "";
    parts[textPartIndex].text = `${pending.merged}\n\n---\n\n${originalText}`;
    return {
        injected: true,
        contextLength: pending.merged.length,
    };
}
export function createContextInjectorHook(collector) {
    return {
        "chat.message": async (input, output) => {
            const result = injectPendingContext(collector, input.sessionID, output.parts);
            if (result.injected) {
                log("[context-injector] Injected pending context via chat.message", {
                    sessionID: input.sessionID,
                    contextLength: result.contextLength,
                });
            }
        },
    };
}
export function createContextInjectorMessagesTransformHook(collector) {
    return {
        "experimental.chat.messages.transform": async (_input, output) => {
            const { messages } = output;
            log("[DEBUG] experimental.chat.messages.transform called", {
                messageCount: messages.length,
            });
            if (messages.length === 0) {
                return;
            }
            let lastUserMessageIndex = -1;
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].info.role === "user") {
                    lastUserMessageIndex = i;
                    break;
                }
            }
            if (lastUserMessageIndex === -1) {
                log("[DEBUG] No user message found in messages");
                return;
            }
            const lastUserMessage = messages[lastUserMessageIndex];
            // Try message.info.sessionID first, fallback to mainSessionID
            const messageSessionID = lastUserMessage.info.sessionID;
            const sessionID = messageSessionID ?? getMainSessionID();
            log("[DEBUG] Extracted sessionID", {
                messageSessionID,
                mainSessionID: getMainSessionID(),
                sessionID,
                infoKeys: Object.keys(lastUserMessage.info),
            });
            if (!sessionID) {
                log("[DEBUG] sessionID is undefined (both message.info and mainSessionID are empty)");
                return;
            }
            const hasPending = collector.hasPending(sessionID);
            log("[DEBUG] Checking hasPending", {
                sessionID,
                hasPending,
            });
            if (!hasPending) {
                return;
            }
            const pending = collector.consume(sessionID);
            if (!pending.hasContent) {
                return;
            }
            const textPartIndex = lastUserMessage.parts.findIndex((p) => p.type === "text" && p.text);
            if (textPartIndex === -1) {
                log("[context-injector] No text part found in last user message, skipping injection", {
                    sessionID,
                    partsCount: lastUserMessage.parts.length,
                });
                return;
            }
            // synthetic part pattern (minimal fields)
            const syntheticPart = {
                id: `synthetic_hook_${sessionID}`,
                messageID: lastUserMessage.info.id,
                sessionID: lastUserMessage.info.sessionID ?? "",
                type: "text",
                text: pending.merged,
                synthetic: true, // hidden in UI
            };
            lastUserMessage.parts.splice(textPartIndex, 0, syntheticPart);
            log("[context-injector] Inserted synthetic part with hook content", {
                sessionID,
                contentLength: pending.merged.length,
            });
        },
    };
}
