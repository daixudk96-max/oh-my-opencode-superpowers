import { isGptModel } from "../../agents/types";
import { getSessionAgent, updateSessionAgent } from "../../features/claude-code-session-state";
import { log } from "../../shared";
import { getAgentConfigKey, getAgentDisplayName } from "../../shared/agent-display-names";
const TOAST_TITLE = "NEVER Use Hephaestus with Non-GPT";
const TOAST_MESSAGE = [
    "Hephaestus is designed exclusively for GPT models.",
    "Hephaestus is trash without GPT.",
    "For Claude/Kimi/GLM models, always use Sisyphus.",
].join("\n");
const SISYPHUS_DISPLAY = getAgentDisplayName("sisyphus");
function showToast(ctx, sessionID, variant) {
    ctx.client.tui.showToast({
        body: {
            title: TOAST_TITLE,
            message: TOAST_MESSAGE,
            variant,
            duration: 10000,
        },
    }).catch((error) => {
        log("[no-hephaestus-non-gpt] Failed to show toast", {
            sessionID,
            error,
        });
    });
}
export function createNoHephaestusNonGptHook(ctx, options) {
    return {
        "chat.message": async (input, output) => {
            const rawAgent = input.agent ?? getSessionAgent(input.sessionID) ?? "";
            const agentKey = getAgentConfigKey(rawAgent);
            const modelID = input.model?.modelID;
            const allowNonGptModel = options?.allowNonGptModel === true;
            if (agentKey === "hephaestus" && modelID && !isGptModel(modelID)) {
                showToast(ctx, input.sessionID, allowNonGptModel ? "warning" : "error");
                if (allowNonGptModel) {
                    return;
                }
                input.agent = SISYPHUS_DISPLAY;
                if (output?.message) {
                    output.message.agent = SISYPHUS_DISPLAY;
                }
                updateSessionAgent(input.sessionID, SISYPHUS_DISPLAY);
            }
        },
    };
}
