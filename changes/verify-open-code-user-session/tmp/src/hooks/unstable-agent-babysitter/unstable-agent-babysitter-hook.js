import { getMainSessionID, getSessionAgent } from "../../features/claude-code-session-state";
import { log } from "../../shared/logger";
import { createInternalAgentTextPart, resolveInheritedPromptTools } from "../../shared";
import { buildReminder, extractMessages, getMessageInfo, getMessageParts, isUnstableTask, THINKING_SUMMARY_MAX_CHARS, } from "./task-message-analyzer";
const HOOK_NAME = "unstable-agent-babysitter";
const DEFAULT_TIMEOUT_MS = 120000;
const COOLDOWN_MS = 5 * 60 * 1000;
async function resolveMainSessionTarget(ctx, sessionID) {
    let agent = getSessionAgent(sessionID);
    let model;
    let tools;
    try {
        const messagesResp = await ctx.client.session.messages({
            path: { id: sessionID },
        });
        const messages = extractMessages(messagesResp);
        for (let i = messages.length - 1; i >= 0; i--) {
            const info = getMessageInfo(messages[i]);
            if (info?.agent || info?.model || (info?.providerID && info?.modelID)) {
                agent = agent ?? info?.agent;
                model = info?.model ?? (info?.providerID && info?.modelID ? { providerID: info.providerID, modelID: info.modelID } : undefined);
                tools = resolveInheritedPromptTools(sessionID, info?.tools) ?? tools;
                break;
            }
        }
    }
    catch (error) {
        log(`[${HOOK_NAME}] Failed to resolve main session agent`, { sessionID, error: String(error) });
    }
    return { agent, model, tools: resolveInheritedPromptTools(sessionID, tools) };
}
async function getThinkingSummary(ctx, sessionID) {
    try {
        const messagesResp = await ctx.client.session.messages({
            path: { id: sessionID },
        });
        const messages = extractMessages(messagesResp);
        const chunks = [];
        for (const message of messages) {
            const info = getMessageInfo(message);
            if (info?.role !== "assistant")
                continue;
            const parts = getMessageParts(message);
            for (const part of parts) {
                if (part.type === "thinking" && part.thinking) {
                    chunks.push(part.thinking);
                }
                if (part.type === "reasoning" && part.text) {
                    chunks.push(part.text);
                }
            }
        }
        const combined = chunks.join("\n").trim();
        if (!combined)
            return null;
        if (combined.length <= THINKING_SUMMARY_MAX_CHARS)
            return combined;
        return combined.slice(0, THINKING_SUMMARY_MAX_CHARS) + "...";
    }
    catch (error) {
        log(`[${HOOK_NAME}] Failed to fetch thinking summary`, { sessionID, error: String(error) });
        return null;
    }
}
export function createUnstableAgentBabysitterHook(ctx, options) {
    const reminderCooldowns = new Map();
    const eventHandler = async ({ event }) => {
        if (event.type !== "session.idle")
            return;
        const props = event.properties;
        const sessionID = props?.sessionID;
        if (!sessionID)
            return;
        const mainSessionID = getMainSessionID();
        if (!mainSessionID || sessionID !== mainSessionID)
            return;
        const tasks = options.backgroundManager.getTasksByParentSession(mainSessionID);
        if (tasks.length === 0)
            return;
        const timeoutMs = options.config?.timeout_ms ?? DEFAULT_TIMEOUT_MS;
        const now = Date.now();
        for (const task of tasks) {
            if (task.status !== "running")
                continue;
            if (!isUnstableTask(task))
                continue;
            const lastMessageAt = task.progress?.lastMessageAt;
            if (!lastMessageAt)
                continue;
            const idleMs = now - lastMessageAt.getTime();
            if (idleMs < timeoutMs)
                continue;
            const lastReminderAt = reminderCooldowns.get(task.id);
            if (lastReminderAt && now - lastReminderAt < COOLDOWN_MS)
                continue;
            const summary = task.sessionID ? await getThinkingSummary(ctx, task.sessionID) : null;
            const reminder = buildReminder(task, summary, idleMs);
            const { agent, model, tools } = await resolveMainSessionTarget(ctx, mainSessionID);
            try {
                await ctx.client.session.promptAsync({
                    path: { id: mainSessionID },
                    body: {
                        ...(agent ? { agent } : {}),
                        ...(model ? { model } : {}),
                        ...(tools ? { tools } : {}),
                        parts: [createInternalAgentTextPart(reminder)],
                    },
                    query: { directory: ctx.directory },
                });
                reminderCooldowns.set(task.id, now);
                log(`[${HOOK_NAME}] Reminder injected`, { taskId: task.id, sessionID: mainSessionID });
            }
            catch (error) {
                log(`[${HOOK_NAME}] Reminder injection failed`, { taskId: task.id, error: String(error) });
            }
        }
    };
    return {
        event: eventHandler,
    };
}
