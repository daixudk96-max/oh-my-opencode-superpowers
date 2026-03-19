import { log } from "../../shared/logger";
import { findNearestMessageWithFields } from "../../features/hook-message-injector";
import { getMessageDir } from "./message-storage-directory";
import { withTimeout } from "./with-timeout";
import { createInternalAgentTextPart, normalizeSDKResponse, resolveInheritedPromptTools, } from "../../shared";
export async function injectContinuationPrompt(ctx, options) {
    let agent;
    let model;
    let tools;
    const sourceSessionID = options.inheritFromSessionID ?? options.sessionID;
    try {
        const messagesResp = await withTimeout(ctx.client.session.messages({
            path: { id: sourceSessionID },
        }), options.apiTimeoutMs);
        const messages = normalizeSDKResponse(messagesResp, []);
        for (let i = messages.length - 1; i >= 0; i--) {
            const info = messages[i]?.info;
            if (info?.agent || info?.model || (info?.modelID && info?.providerID)) {
                agent = info.agent;
                model =
                    info.model ??
                        (info.providerID && info.modelID
                            ? { providerID: info.providerID, modelID: info.modelID }
                            : undefined);
                tools = info.tools;
                break;
            }
        }
    }
    catch {
        const messageDir = getMessageDir(sourceSessionID);
        const currentMessage = messageDir ? findNearestMessageWithFields(messageDir) : null;
        agent = currentMessage?.agent;
        model =
            currentMessage?.model?.providerID && currentMessage?.model?.modelID
                ? {
                    providerID: currentMessage.model.providerID,
                    modelID: currentMessage.model.modelID,
                }
                : undefined;
        tools = currentMessage?.tools;
    }
    const inheritedTools = resolveInheritedPromptTools(sourceSessionID, tools);
    await ctx.client.session.promptAsync({
        path: { id: options.sessionID },
        body: {
            ...(agent !== undefined ? { agent } : {}),
            ...(model !== undefined ? { model } : {}),
            ...(inheritedTools ? { tools: inheritedTools } : {}),
            parts: [createInternalAgentTextPart(options.prompt)],
        },
        query: { directory: options.directory },
    });
    log("[ralph-loop] continuation injected", { sessionID: options.sessionID });
}
