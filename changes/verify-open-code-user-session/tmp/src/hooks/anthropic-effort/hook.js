import { log, normalizeModelID } from "../../shared";
const OPUS_4_6_PATTERN = /claude-opus-4[-.]6/i;
function isClaudeProvider(providerID, modelID) {
    if (["anthropic", "google-vertex-anthropic", "opencode"].includes(providerID))
        return true;
    if (providerID === "github-copilot" && modelID.toLowerCase().includes("claude"))
        return true;
    return false;
}
function isOpus46(modelID) {
    const normalized = normalizeModelID(modelID);
    return OPUS_4_6_PATTERN.test(normalized);
}
export function createAnthropicEffortHook() {
    return {
        "chat.params": async (input, output) => {
            const { model, message } = input;
            if (!model?.modelID || !model?.providerID)
                return;
            if (message.variant !== "max")
                return;
            if (!isClaudeProvider(model.providerID, model.modelID))
                return;
            if (!isOpus46(model.modelID))
                return;
            if (output.options.effort !== undefined)
                return;
            output.options.effort = "max";
            log("anthropic-effort: injected effort=max", {
                sessionID: input.sessionID,
                provider: model.providerID,
                model: model.modelID,
            });
        },
    };
}
