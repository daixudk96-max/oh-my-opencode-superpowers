import { clearSessionAgent, getMainSessionID, getSessionAgent, setMainSession, subagentSessions, syncSubagentSessions, updateSessionAgent, } from "../features/claude-code-session-state";
import { clearPendingModelFallback, clearSessionFallbackChain, setPendingModelFallback, } from "../hooks/model-fallback/hook";
import { resetMessageCursor } from "../shared";
import { log } from "../shared/logger";
import { shouldRetryError } from "../shared/model-error-classifier";
import { clearSessionModel, setSessionModel } from "../shared/session-model-state";
import { deleteSessionTools } from "../shared/session-tools-store";
import { lspManager } from "../tools";
import { pruneRecentSyntheticIdles } from "./recent-synthetic-idles";
import { normalizeSessionStatusToIdle } from "./session-status-normalizer";
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function normalizeFallbackModelID(modelID) {
    return modelID
        .replace(/-thinking$/i, "")
        .replace(/-max$/i, "")
        .replace(/-high$/i, "");
}
function extractErrorName(error) {
    if (isRecord(error) && typeof error.name === "string")
        return error.name;
    if (error instanceof Error)
        return error.name;
    return undefined;
}
function extractErrorMessage(error) {
    if (!error)
        return "";
    if (typeof error === "string")
        return error;
    if (error instanceof Error)
        return error.message;
    if (isRecord(error)) {
        const candidates = [
            error,
            error.data,
            error.error,
            isRecord(error.data) ? error.data.error : undefined,
            error.cause,
        ];
        for (const candidate of candidates) {
            if (isRecord(candidate) && typeof candidate.message === "string" && candidate.message.length > 0) {
                return candidate.message;
            }
        }
    }
    try {
        return JSON.stringify(error);
    }
    catch {
        return String(error);
    }
}
function extractProviderModelFromErrorMessage(message) {
    const lower = message.toLowerCase();
    const providerModel = lower.match(/model\s+not\s+found:\s*([a-z0-9_-]+)\s*\/\s*([a-z0-9._-]+)/i);
    if (providerModel) {
        return {
            providerID: providerModel[1],
            modelID: providerModel[2],
        };
    }
    const modelOnly = lower.match(/unknown\s+provider\s+for\s+model\s+([a-z0-9._-]+)/i);
    if (modelOnly) {
        return {
            modelID: modelOnly[1],
        };
    }
    return {};
}
export function createEventHandler(args) {
    const { ctx, firstMessageVariantGate, managers, hooks } = args;
    const pluginContext = ctx;
    const isRuntimeFallbackEnabled = hooks.runtimeFallback !== null &&
        hooks.runtimeFallback !== undefined &&
        (typeof args.pluginConfig.runtime_fallback === "boolean"
            ? args.pluginConfig.runtime_fallback
            : (args.pluginConfig.runtime_fallback?.enabled ?? false));
    const isModelFallbackEnabled = hooks.modelFallback !== null && hooks.modelFallback !== undefined;
    // Avoid triggering multiple abort+continue cycles for the same failing assistant message.
    const lastHandledModelErrorMessageID = new Map();
    const lastHandledRetryStatusKey = new Map();
    const lastKnownModelBySession = new Map();
    const dispatchToHooks = async (input) => {
        await Promise.resolve(hooks.autoUpdateChecker?.event?.(input));
        await Promise.resolve(hooks.claudeCodeHooks?.event?.(input));
        await Promise.resolve(hooks.backgroundNotificationHook?.event?.(input));
        await Promise.resolve(hooks.sessionNotification?.(input));
        await Promise.resolve(hooks.todoContinuationEnforcer?.handler?.(input));
        await Promise.resolve(hooks.unstableAgentBabysitter?.event?.(input));
        await Promise.resolve(hooks.contextWindowMonitor?.event?.(input));
        await Promise.resolve(hooks.directoryAgentsInjector?.event?.(input));
        await Promise.resolve(hooks.directoryReadmeInjector?.event?.(input));
        await Promise.resolve(hooks.rulesInjector?.event?.(input));
        await Promise.resolve(hooks.thinkMode?.event?.(input));
        await Promise.resolve(hooks.anthropicContextWindowLimitRecovery?.event?.(input));
        await Promise.resolve(hooks.runtimeFallback?.event?.(input));
        await Promise.resolve(hooks.agentUsageReminder?.event?.(input));
        await Promise.resolve(hooks.categorySkillReminder?.event?.(input));
        await Promise.resolve(hooks.interactiveBashSession?.event?.(input));
        await Promise.resolve(hooks.ralphLoop?.event?.(input));
        await Promise.resolve(hooks.stopContinuationGuard?.event?.(input));
        await Promise.resolve(hooks.compactionTodoPreserver?.event?.(input));
        await Promise.resolve(hooks.writeExistingFileGuard?.event?.(input));
        await Promise.resolve(hooks.atlasHook?.handler?.(input));
    };
    const recentSyntheticIdles = new Map();
    const recentRealIdles = new Map();
    const DEDUP_WINDOW_MS = 500;
    const shouldAutoRetrySession = (sessionID) => {
        if (syncSubagentSessions.has(sessionID))
            return true;
        const mainSessionID = getMainSessionID();
        if (mainSessionID)
            return sessionID === mainSessionID;
        // Headless runs (or resumed sessions) may not emit session.created, so mainSessionID can be unset.
        // In that case, treat any non-subagent session as the "main" interactive session.
        return !subagentSessions.has(sessionID);
    };
    return async (input) => {
        pruneRecentSyntheticIdles({
            recentSyntheticIdles,
            recentRealIdles,
            now: Date.now(),
            dedupWindowMs: DEDUP_WINDOW_MS,
        });
        if (input.event.type === "session.idle") {
            const sessionID = input.event.properties?.sessionID;
            if (sessionID) {
                const emittedAt = recentSyntheticIdles.get(sessionID);
                if (emittedAt && Date.now() - emittedAt < DEDUP_WINDOW_MS) {
                    recentSyntheticIdles.delete(sessionID);
                    return;
                }
                recentRealIdles.set(sessionID, Date.now());
            }
        }
        await dispatchToHooks(input);
        const syntheticIdle = normalizeSessionStatusToIdle(input);
        if (syntheticIdle) {
            const sessionID = syntheticIdle.event.properties?.sessionID;
            const emittedAt = recentRealIdles.get(sessionID);
            if (emittedAt && Date.now() - emittedAt < DEDUP_WINDOW_MS) {
                recentRealIdles.delete(sessionID);
                return;
            }
            recentSyntheticIdles.set(sessionID, Date.now());
            await dispatchToHooks(syntheticIdle);
        }
        const { event } = input;
        const props = event.properties;
        if (event.type === "session.created") {
            const sessionInfo = props?.info;
            if (!sessionInfo?.parentID) {
                setMainSession(sessionInfo?.id);
            }
            firstMessageVariantGate.markSessionCreated(sessionInfo);
            await managers.tmuxSessionManager.onSessionCreated(event);
        }
        if (event.type === "session.deleted") {
            const sessionInfo = props?.info;
            if (sessionInfo?.id === getMainSessionID()) {
                setMainSession(undefined);
            }
            if (sessionInfo?.id) {
                clearSessionAgent(sessionInfo.id);
                lastHandledModelErrorMessageID.delete(sessionInfo.id);
                lastHandledRetryStatusKey.delete(sessionInfo.id);
                lastKnownModelBySession.delete(sessionInfo.id);
                clearPendingModelFallback(sessionInfo.id);
                clearSessionFallbackChain(sessionInfo.id);
                resetMessageCursor(sessionInfo.id);
                firstMessageVariantGate.clear(sessionInfo.id);
                clearSessionModel(sessionInfo.id);
                syncSubagentSessions.delete(sessionInfo.id);
                deleteSessionTools(sessionInfo.id);
                await managers.skillMcpManager.disconnectSession(sessionInfo.id);
                await lspManager.cleanupTempDirectoryClients();
                await managers.tmuxSessionManager.onSessionDeleted({
                    sessionID: sessionInfo.id,
                });
            }
        }
        if (event.type === "message.updated") {
            const info = props?.info;
            const sessionID = info?.sessionID;
            const agent = info?.agent;
            const role = info?.role;
            if (sessionID && role === "user") {
                if (agent) {
                    updateSessionAgent(sessionID, agent);
                }
                const providerID = info?.providerID;
                const modelID = info?.modelID;
                if (providerID && modelID) {
                    lastKnownModelBySession.set(sessionID, { providerID, modelID });
                    setSessionModel(sessionID, { providerID, modelID });
                }
            }
            // Model fallback: in practice, API/model failures often surface as assistant message errors.
            // session.error events are not guaranteed for all providers, so we also observe message.updated.
            if (sessionID && role === "assistant" && !isRuntimeFallbackEnabled && isModelFallbackEnabled) {
                try {
                    const assistantMessageID = info?.id;
                    const assistantError = info?.error;
                    if (assistantMessageID && assistantError) {
                        const lastHandled = lastHandledModelErrorMessageID.get(sessionID);
                        if (lastHandled === assistantMessageID) {
                            return;
                        }
                        const errorName = extractErrorName(assistantError);
                        const errorMessage = extractErrorMessage(assistantError);
                        const errorInfo = { name: errorName, message: errorMessage };
                        if (shouldRetryError(errorInfo)) {
                            // Prefer the agent/model/provider from the assistant message payload.
                            let agentName = agent ?? getSessionAgent(sessionID);
                            if (!agentName && sessionID === getMainSessionID()) {
                                if (errorMessage.includes("claude-opus") || errorMessage.includes("opus")) {
                                    agentName = "sisyphus";
                                }
                                else if (errorMessage.includes("gpt-5")) {
                                    agentName = "hephaestus";
                                }
                                else {
                                    agentName = "sisyphus";
                                }
                            }
                            if (agentName) {
                                const currentProvider = info?.providerID ?? "opencode";
                                const rawModel = info?.modelID ?? "claude-opus-4-6";
                                const currentModel = normalizeFallbackModelID(rawModel);
                                const setFallback = setPendingModelFallback(sessionID, agentName, currentProvider, currentModel);
                                if (setFallback &&
                                    shouldAutoRetrySession(sessionID) &&
                                    !hooks.stopContinuationGuard?.isStopped(sessionID)) {
                                    lastHandledModelErrorMessageID.set(sessionID, assistantMessageID);
                                    await pluginContext.client.session.abort({ path: { id: sessionID } }).catch(() => { });
                                    await pluginContext.client.session
                                        .prompt({
                                        path: { id: sessionID },
                                        body: { parts: [{ type: "text", text: "continue" }] },
                                        query: { directory: pluginContext.directory },
                                    })
                                        .catch(() => { });
                                }
                            }
                        }
                    }
                }
                catch (err) {
                    log("[event] model-fallback error in message.updated:", { sessionID, error: err });
                }
            }
        }
        if (event.type === "session.status") {
            const sessionID = props?.sessionID;
            const status = props?.status;
            if (sessionID && status?.type === "retry" && isModelFallbackEnabled) {
                try {
                    const retryMessage = typeof status.message === "string" ? status.message : "";
                    const retryKey = `${status.attempt ?? "?"}:${status.next ?? "?"}:${retryMessage}`;
                    if (lastHandledRetryStatusKey.get(sessionID) === retryKey) {
                        return;
                    }
                    lastHandledRetryStatusKey.set(sessionID, retryKey);
                    const errorInfo = { name: undefined, message: retryMessage };
                    if (shouldRetryError(errorInfo)) {
                        let agentName = getSessionAgent(sessionID);
                        if (!agentName && sessionID === getMainSessionID()) {
                            if (retryMessage.includes("claude-opus") || retryMessage.includes("opus")) {
                                agentName = "sisyphus";
                            }
                            else if (retryMessage.includes("gpt-5")) {
                                agentName = "hephaestus";
                            }
                            else {
                                agentName = "sisyphus";
                            }
                        }
                        if (agentName) {
                            const parsed = extractProviderModelFromErrorMessage(retryMessage);
                            const lastKnown = lastKnownModelBySession.get(sessionID);
                            const currentProvider = parsed.providerID ?? lastKnown?.providerID ?? "opencode";
                            let currentModel = parsed.modelID ?? lastKnown?.modelID ?? "claude-opus-4-6";
                            currentModel = normalizeFallbackModelID(currentModel);
                            const setFallback = setPendingModelFallback(sessionID, agentName, currentProvider, currentModel);
                            if (setFallback &&
                                shouldAutoRetrySession(sessionID) &&
                                !hooks.stopContinuationGuard?.isStopped(sessionID)) {
                                await pluginContext.client.session.abort({ path: { id: sessionID } }).catch(() => { });
                                await pluginContext.client.session
                                    .prompt({
                                    path: { id: sessionID },
                                    body: { parts: [{ type: "text", text: "continue" }] },
                                    query: { directory: pluginContext.directory },
                                })
                                    .catch(() => { });
                            }
                        }
                    }
                }
                catch (err) {
                    log("[event] model-fallback error in session.status:", { sessionID, error: err });
                }
            }
        }
        if (event.type === "session.error") {
            try {
                const sessionID = props?.sessionID;
                const error = props?.error;
                const errorName = extractErrorName(error);
                const errorMessage = extractErrorMessage(error);
                const errorInfo = { name: errorName, message: errorMessage };
                // First, try session recovery for internal errors (thinking blocks, tool results, etc.)
                if (hooks.sessionRecovery?.isRecoverableError(error)) {
                    const messageInfo = {
                        id: props?.messageID,
                        role: "assistant",
                        sessionID,
                        error,
                    };
                    const recovered = await hooks.sessionRecovery.handleSessionRecovery(messageInfo);
                    if (recovered &&
                        sessionID &&
                        sessionID === getMainSessionID() &&
                        !hooks.stopContinuationGuard?.isStopped(sessionID)) {
                        await pluginContext.client.session
                            .prompt({
                            path: { id: sessionID },
                            body: { parts: [{ type: "text", text: "continue" }] },
                            query: { directory: pluginContext.directory },
                        })
                            .catch(() => { });
                    }
                }
                // Second, try model fallback for model errors (rate limit, quota, provider issues, etc.)
                else if (sessionID && shouldRetryError(errorInfo) && !isRuntimeFallbackEnabled && isModelFallbackEnabled) {
                    let agentName = getSessionAgent(sessionID);
                    if (!agentName && sessionID === getMainSessionID()) {
                        if (errorMessage.includes("claude-opus") || errorMessage.includes("opus")) {
                            agentName = "sisyphus";
                        }
                        else if (errorMessage.includes("gpt-5")) {
                            agentName = "hephaestus";
                        }
                        else {
                            agentName = "sisyphus";
                        }
                    }
                    if (agentName) {
                        const parsed = extractProviderModelFromErrorMessage(errorMessage);
                        const currentProvider = props?.providerID || parsed.providerID || "opencode";
                        let currentModel = props?.modelID || parsed.modelID || "claude-opus-4-6";
                        currentModel = normalizeFallbackModelID(currentModel);
                        const setFallback = setPendingModelFallback(sessionID, agentName, currentProvider, currentModel);
                        if (setFallback &&
                            shouldAutoRetrySession(sessionID) &&
                            !hooks.stopContinuationGuard?.isStopped(sessionID)) {
                            await pluginContext.client.session.abort({ path: { id: sessionID } }).catch(() => { });
                            await pluginContext.client.session
                                .prompt({
                                path: { id: sessionID },
                                body: { parts: [{ type: "text", text: "continue" }] },
                                query: { directory: pluginContext.directory },
                            })
                                .catch(() => { });
                        }
                    }
                }
            }
            catch (err) {
                const sessionID = props?.sessionID;
                log("[event] model-fallback error in session.error:", { sessionID, error: err });
            }
        }
    };
}
