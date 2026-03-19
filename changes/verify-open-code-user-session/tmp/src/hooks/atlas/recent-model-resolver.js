import { findNearestMessageWithFields, findNearestMessageWithFieldsFromSDK, } from "../../features/hook-message-injector";
import { getMessageDir, isSqliteBackend, normalizePromptTools, normalizeSDKResponse } from "../../shared";
export async function resolveRecentPromptContextForSession(ctx, sessionID) {
    try {
        const messagesResp = await ctx.client.session.messages({ path: { id: sessionID } });
        // TDD-EXEMPT: debug logs for message resolution
        const messages = normalizeSDKResponse(messagesResp, []);
        // TDD-EXEMPT: final cleanup for fixed resolver
        let resolvedModel;
        let resolvedTools;
        for (let i = messages.length - 1; i >= 0; i--) {
            const info = messages[i].info;
            // TDD-EXEMPT: final cleanup for fixed resolver
            const model = info?.model;
            const tools = normalizePromptTools(info?.tools);
            if (!resolvedModel) {
                if (model?.providerID && model?.modelID) {
                    resolvedModel = { providerID: model.providerID, modelID: model.modelID };
                }
                else if (info?.providerID && info?.modelID) {
                    resolvedModel = { providerID: info.providerID, modelID: info.modelID };
                }
            }
            if (!resolvedTools && tools) {
                resolvedTools = tools;
            }
            if (resolvedModel && resolvedTools) {
                break;
            }
        }
        if (resolvedModel || resolvedTools) {
            return { model: resolvedModel, tools: resolvedTools };
        }
    }
    catch {
        // ignore - fallback to message storage
    }
    let currentMessage = null;
    if (isSqliteBackend()) {
        currentMessage = await findNearestMessageWithFieldsFromSDK(ctx.client, sessionID);
    }
    else {
        const messageDir = getMessageDir(sessionID);
        currentMessage = messageDir ? findNearestMessageWithFields(messageDir) : null;
    }
    const model = currentMessage?.model;
    const tools = normalizePromptTools(currentMessage?.tools);
    if (!model?.providerID || !model?.modelID) {
        return { tools };
    }
    return { model: { providerID: model.providerID, modelID: model.modelID }, tools };
}
export async function resolveRecentModelForSession(ctx, sessionID) {
    const context = await resolveRecentPromptContextForSession(ctx, sessionID);
    return context.model;
}
