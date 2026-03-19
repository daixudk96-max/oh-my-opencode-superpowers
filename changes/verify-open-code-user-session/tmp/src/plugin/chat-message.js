import { hasConnectedProvidersCache } from "../shared";
import { setSessionModel } from "../shared/session-model-state";
import { setSessionAgent } from "../features/claude-code-session-state";
import { applyUltraworkModelOverrideOnMessage } from "./ultrawork-model-override";
import { parseRalphLoopArguments } from "../hooks/ralph-loop/command-arguments";
function isStartWorkHookOutput(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const record = value;
    const partsValue = record["parts"];
    if (!Array.isArray(partsValue))
        return false;
    return partsValue.every((part) => {
        if (typeof part !== "object" || part === null)
            return false;
        const partRecord = part;
        return typeof partRecord["type"] === "string";
    });
}
export function createChatMessageHandler(args) {
    const { ctx, pluginConfig, firstMessageVariantGate, hooks } = args;
    const pluginContext = ctx;
    const isRuntimeFallbackEnabled = hooks.runtimeFallback !== null &&
        hooks.runtimeFallback !== undefined &&
        (typeof pluginConfig.runtime_fallback === "boolean"
            ? pluginConfig.runtime_fallback
            : (pluginConfig.runtime_fallback?.enabled ?? false));
    return async (input, output) => {
        if (input.agent) {
            setSessionAgent(input.sessionID, input.agent);
        }
        if (firstMessageVariantGate.shouldOverride(input.sessionID)) {
            firstMessageVariantGate.markApplied(input.sessionID);
        }
        if (!isRuntimeFallbackEnabled) {
            await hooks.modelFallback?.["chat.message"]?.(input, output);
        }
        const modelOverride = output.message["model"];
        if (modelOverride &&
            typeof modelOverride === "object" &&
            "providerID" in modelOverride &&
            "modelID" in modelOverride) {
            const providerID = modelOverride.providerID;
            const modelID = modelOverride.modelID;
            if (typeof providerID === "string" && typeof modelID === "string") {
                setSessionModel(input.sessionID, { providerID, modelID });
            }
        }
        else if (input.model) {
            setSessionModel(input.sessionID, input.model);
        }
        await hooks.stopContinuationGuard?.["chat.message"]?.(input);
        await hooks.backgroundNotificationHook?.["chat.message"]?.(input, output);
        await hooks.runtimeFallback?.["chat.message"]?.(input, output);
        await hooks.keywordDetector?.["chat.message"]?.(input, output);
        await hooks.thinkMode?.["chat.message"]?.(input, output);
        await hooks.claudeCodeHooks?.["chat.message"]?.(input, output);
        await hooks.autoSlashCommand?.["chat.message"]?.(input, output);
        await hooks.noSisyphusGpt?.["chat.message"]?.(input, output);
        await hooks.noHephaestusNonGpt?.["chat.message"]?.(input, output);
        if (hooks.startWork && isStartWorkHookOutput(output)) {
            await hooks.startWork["chat.message"]?.(input, output);
        }
        if (!hasConnectedProvidersCache()) {
            pluginContext.client.tui
                .showToast({
                body: {
                    title: "⚠️ Provider Cache Missing",
                    message: "Model filtering disabled. RESTART OpenCode to enable full functionality.",
                    variant: "warning",
                    duration: 6000,
                },
            })
                .catch(() => { });
        }
        if (hooks.ralphLoop) {
            const parts = output.parts;
            const promptText = parts
                ?.filter((p) => p.type === "text" && p.text)
                .map((p) => p.text)
                .join("\n")
                .trim() || "";
            const isRalphLoopTemplate = promptText.includes("You are starting a Ralph Loop") &&
                promptText.includes("<user-task>");
            const isCancelRalphTemplate = promptText.includes("Cancel the currently active Ralph Loop");
            if (isRalphLoopTemplate) {
                const taskMatch = promptText.match(/<user-task>\s*([\s\S]*?)\s*<\/user-task>/i);
                const rawTask = taskMatch?.[1]?.trim() || "";
                const parsedArguments = parseRalphLoopArguments(rawTask);
                hooks.ralphLoop.startLoop(input.sessionID, parsedArguments.prompt, {
                    maxIterations: parsedArguments.maxIterations,
                    completionPromise: parsedArguments.completionPromise,
                    strategy: parsedArguments.strategy,
                });
            }
            else if (isCancelRalphTemplate) {
                hooks.ralphLoop.cancelLoop(input.sessionID);
            }
        }
        applyUltraworkModelOverrideOnMessage(pluginConfig, input.agent, output, pluginContext.client.tui, input.sessionID);
    };
}
