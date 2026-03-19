import { getSessionAgent } from "../features/claude-code-session-state";
import { log } from "../shared";
import { getAgentConfigKey } from "../shared/agent-display-names";
import { scheduleDeferredModelOverride } from "./ultrawork-db-model-override";
const CODE_BLOCK = /```[\s\S]*?```/g;
const INLINE_CODE = /`[^`]+`/g;
const ULTRAWORK_PATTERN = /\b(ultrawork|ulw)\b/i;
export function detectUltrawork(text) {
    const clean = text.replace(CODE_BLOCK, "").replace(INLINE_CODE, "");
    return ULTRAWORK_PATTERN.test(clean);
}
function extractPromptText(parts) {
    return parts.filter((p) => p.type === "text").map((p) => p.text || "").join("");
}
function showToast(tui, title, message) {
    const toastFn = tui;
    if (typeof toastFn.showToast !== "function")
        return;
    toastFn.showToast({
        body: { title, message, variant: "warning", duration: 3000 },
    }).catch(() => { });
}
function isSameModel(current, target) {
    if (typeof current !== "object" || current === null)
        return false;
    const currentRecord = current;
    return (currentRecord["providerID"] === target.providerID
        && currentRecord["modelID"] === target.modelID);
}
/**
 * Resolves the ultrawork model override config for the given agent and prompt text.
 * Returns null if no override should be applied.
 */
export function resolveUltraworkOverride(pluginConfig, inputAgentName, output, sessionID) {
    const promptText = extractPromptText(output.parts);
    if (!detectUltrawork(promptText))
        return null;
    const messageAgentName = typeof output.message["agent"] === "string" ? output.message["agent"] : undefined;
    const sessionAgentName = sessionID ? getSessionAgent(sessionID) : undefined;
    const rawAgentName = inputAgentName ?? messageAgentName ?? sessionAgentName;
    if (!rawAgentName || !pluginConfig.agents)
        return null;
    const agentConfigKey = getAgentConfigKey(rawAgentName);
    const agentConfig = pluginConfig.agents[agentConfigKey];
    const ultraworkConfig = agentConfig?.ultrawork;
    if (!ultraworkConfig?.model && !ultraworkConfig?.variant)
        return null;
    if (!ultraworkConfig.model) {
        return {
            variant: ultraworkConfig.variant,
        };
    }
    const modelParts = ultraworkConfig.model.split("/");
    if (modelParts.length < 2)
        return null;
    return {
        providerID: modelParts[0],
        modelID: modelParts.slice(1).join("/"),
        variant: ultraworkConfig.variant,
    };
}
/**
 * Applies ultrawork model override using a deferred DB update strategy.
 *
 * Instead of directly mutating output.message.model (which would cause the TUI
 * bottom bar to show the override model), this schedules a queueMicrotask that
 * updates the message model directly in SQLite AFTER Session.updateMessage()
 * saves the original model, but BEFORE loop() reads it for the API call.
 *
 * Result: API call uses opus, TUI bottom bar stays on sonnet.
 */
export function applyUltraworkModelOverrideOnMessage(pluginConfig, inputAgentName, output, tui, sessionID) {
    const override = resolveUltraworkOverride(pluginConfig, inputAgentName, output, sessionID);
    if (!override)
        return;
    if (override.variant) {
        output.message["variant"] = override.variant;
        output.message["thinking"] = override.variant;
    }
    if (!override.providerID || !override.modelID) {
        return;
    }
    const targetModel = { providerID: override.providerID, modelID: override.modelID };
    if (isSameModel(output.message.model, targetModel)) {
        log(`[ultrawork-model-override] Skip override; target model already active: ${override.modelID}`);
        return;
    }
    const messageId = output.message["id"];
    if (!messageId) {
        log("[ultrawork-model-override] No message ID found, falling back to direct mutation");
        output.message.model = targetModel;
        return;
    }
    const fromModel = output.message.model?.modelID ?? "unknown";
    const agentConfigKey = getAgentConfigKey(inputAgentName ??
        (typeof output.message["agent"] === "string" ? output.message["agent"] : "unknown"));
    scheduleDeferredModelOverride(messageId, targetModel, override.variant);
    log(`[ultrawork-model-override] ${fromModel} -> ${override.modelID} (deferred DB)`, {
        agent: agentConfigKey,
    });
    showToast(tui, "Ultrawork Model Override", `${fromModel} \u2192 ${override.modelID}. Maximum precision engaged.`);
}
