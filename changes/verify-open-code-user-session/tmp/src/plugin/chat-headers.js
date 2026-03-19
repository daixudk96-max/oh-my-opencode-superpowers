import { OMO_INTERNAL_INITIATOR_MARKER } from "../shared";
const INTERNAL_MARKER_CACHE_LIMIT = 1000;
const internalMarkerCache = new Map();
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function buildChatHeadersInput(raw) {
    if (!isRecord(raw))
        return null;
    const sessionID = raw.sessionID;
    const provider = raw.provider;
    const message = raw.message;
    if (typeof sessionID !== "string")
        return null;
    if (!isRecord(provider) || typeof provider.id !== "string")
        return null;
    if (!isRecord(message))
        return null;
    return {
        sessionID,
        provider: { id: provider.id },
        message: {
            id: typeof message.id === "string" ? message.id : undefined,
            role: typeof message.role === "string" ? message.role : undefined,
        },
    };
}
function isChatHeadersOutput(raw) {
    if (!isRecord(raw))
        return false;
    if (!isRecord(raw.headers)) {
        raw.headers = {};
    }
    return isRecord(raw.headers);
}
function isCopilotProvider(providerID) {
    return providerID === "github-copilot" || providerID === "github-copilot-enterprise";
}
async function hasInternalMarker(client, sessionID, messageID) {
    const cacheKey = `${sessionID}:${messageID}`;
    const cached = internalMarkerCache.get(cacheKey);
    if (cached !== undefined) {
        return cached;
    }
    try {
        const response = await client.session.message({
            path: { id: sessionID, messageID },
        });
        const data = response.data;
        if (!isRecord(data) || !Array.isArray(data.parts)) {
            internalMarkerCache.set(cacheKey, false);
            if (internalMarkerCache.size > INTERNAL_MARKER_CACHE_LIMIT) {
                internalMarkerCache.clear();
            }
            return false;
        }
        const hasMarker = data.parts.some((part) => {
            if (!isRecord(part) || part.type !== "text" || typeof part.text !== "string") {
                return false;
            }
            return part.text.includes(OMO_INTERNAL_INITIATOR_MARKER);
        });
        internalMarkerCache.set(cacheKey, hasMarker);
        if (internalMarkerCache.size > INTERNAL_MARKER_CACHE_LIMIT) {
            internalMarkerCache.clear();
        }
        return hasMarker;
    }
    catch {
        internalMarkerCache.set(cacheKey, false);
        if (internalMarkerCache.size > INTERNAL_MARKER_CACHE_LIMIT) {
            internalMarkerCache.clear();
        }
        return false;
    }
}
async function isOmoInternalMessage(input, client) {
    if (input.message.role !== "user") {
        return false;
    }
    if (!input.message.id) {
        return false;
    }
    return hasInternalMarker(client, input.sessionID, input.message.id);
}
export function createChatHeadersHandler(args) {
    const { ctx } = args;
    return async (input, output) => {
        const normalizedInput = buildChatHeadersInput(input);
        if (!normalizedInput)
            return;
        if (!isChatHeadersOutput(output))
            return;
        if (!isCopilotProvider(normalizedInput.provider.id))
            return;
        // Do not override x-initiator when @ai-sdk/github-copilot is active.
        // OpenCode's copilot fetch wrapper already sets x-initiator based on
        // the actual request body content. Overriding it here causes a mismatch
        // that the Copilot API rejects with "invalid initiator".
        const model = isRecord(input) && isRecord(input.model)
            ? input.model
            : undefined;
        const api = model && isRecord(model.api) ? model.api : undefined;
        if (api?.npm === "@ai-sdk/github-copilot")
            return;
        if (!(await isOmoInternalMessage(normalizedInput, ctx.client)))
            return;
        output.headers["x-initiator"] = "agent";
    };
}
