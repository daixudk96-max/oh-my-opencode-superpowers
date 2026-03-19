import { subagentSessions, getMainSessionID } from "../features/claude-code-session-state";
import { startBackgroundCheck, } from "./session-notification-utils";
import * as sessionNotificationSender from "./session-notification-sender";
import { hasIncompleteTodos } from "./session-todo-status";
import { createIdleNotificationScheduler } from "./session-notification-scheduler";
export function createSessionNotification(ctx, config = {}) {
    const currentPlatform = sessionNotificationSender.detectPlatform();
    const defaultSoundPath = sessionNotificationSender.getDefaultSoundPath(currentPlatform);
    startBackgroundCheck(currentPlatform);
    const mergedConfig = {
        title: "OpenCode",
        message: "Agent is ready for input",
        questionMessage: "Agent is asking a question",
        permissionMessage: "Agent needs permission to continue",
        playSound: false,
        soundPath: defaultSoundPath,
        idleConfirmationDelay: 1500,
        skipIfIncompleteTodos: true,
        maxTrackedSessions: 100,
        enforceMainSessionFilter: true,
        ...config,
    };
    const scheduler = createIdleNotificationScheduler({
        ctx,
        platform: currentPlatform,
        config: mergedConfig,
        hasIncompleteTodos,
        send: sessionNotificationSender.sendSessionNotification,
        playSound: sessionNotificationSender.playSessionNotificationSound,
    });
    const QUESTION_TOOLS = new Set(["question", "ask_user_question", "askuserquestion"]);
    const PERMISSION_EVENTS = new Set(["permission.ask", "permission.asked", "permission.updated", "permission.requested"]);
    const PERMISSION_HINT_PATTERN = /\b(permission|approve|approval|allow|deny|consent)\b/i;
    const getSessionID = (properties) => {
        const sessionID = properties?.sessionID;
        if (typeof sessionID === "string" && sessionID.length > 0)
            return sessionID;
        const sessionId = properties?.sessionId;
        if (typeof sessionId === "string" && sessionId.length > 0)
            return sessionId;
        const info = properties?.info;
        const infoSessionID = info?.sessionID;
        if (typeof infoSessionID === "string" && infoSessionID.length > 0)
            return infoSessionID;
        const infoSessionId = info?.sessionId;
        if (typeof infoSessionId === "string" && infoSessionId.length > 0)
            return infoSessionId;
        return undefined;
    };
    const shouldNotifyForSession = (sessionID) => {
        if (subagentSessions.has(sessionID))
            return false;
        if (mergedConfig.enforceMainSessionFilter) {
            const mainSessionID = getMainSessionID();
            if (mainSessionID && sessionID !== mainSessionID)
                return false;
        }
        return true;
    };
    const getEventToolName = (properties) => {
        const tool = properties?.tool;
        if (typeof tool === "string" && tool.length > 0)
            return tool;
        const name = properties?.name;
        if (typeof name === "string" && name.length > 0)
            return name;
        return undefined;
    };
    const getQuestionText = (properties) => {
        const args = properties?.args;
        const questions = args?.questions;
        if (!Array.isArray(questions) || questions.length === 0)
            return "";
        const firstQuestion = questions[0];
        const questionText = firstQuestion?.question;
        return typeof questionText === "string" ? questionText : "";
    };
    return async ({ event }) => {
        if (currentPlatform === "unsupported")
            return;
        const props = event.properties;
        if (event.type === "session.created") {
            const info = props?.info;
            const sessionID = info?.id;
            if (sessionID) {
                scheduler.markSessionActivity(sessionID);
            }
            return;
        }
        if (event.type === "session.idle") {
            const sessionID = getSessionID(props);
            if (!sessionID)
                return;
            if (!shouldNotifyForSession(sessionID))
                return;
            scheduler.scheduleIdleNotification(sessionID);
            return;
        }
        if (event.type === "message.updated") {
            const info = props?.info;
            const sessionID = getSessionID({ ...props, info });
            if (sessionID) {
                scheduler.markSessionActivity(sessionID);
            }
            return;
        }
        if (PERMISSION_EVENTS.has(event.type)) {
            const sessionID = getSessionID(props);
            if (!sessionID)
                return;
            if (!shouldNotifyForSession(sessionID))
                return;
            scheduler.markSessionActivity(sessionID);
            await sessionNotificationSender.sendSessionNotification(ctx, currentPlatform, mergedConfig.title, mergedConfig.permissionMessage);
            if (mergedConfig.playSound && mergedConfig.soundPath) {
                await sessionNotificationSender.playSessionNotificationSound(ctx, currentPlatform, mergedConfig.soundPath);
            }
            return;
        }
        if (event.type === "tool.execute.before" || event.type === "tool.execute.after") {
            const sessionID = getSessionID(props);
            if (sessionID) {
                scheduler.markSessionActivity(sessionID);
                if (event.type === "tool.execute.before") {
                    const toolName = getEventToolName(props)?.toLowerCase();
                    if (toolName && QUESTION_TOOLS.has(toolName)) {
                        if (!shouldNotifyForSession(sessionID))
                            return;
                        const questionText = getQuestionText(props);
                        const message = PERMISSION_HINT_PATTERN.test(questionText)
                            ? mergedConfig.permissionMessage
                            : mergedConfig.questionMessage;
                        await sessionNotificationSender.sendSessionNotification(ctx, currentPlatform, mergedConfig.title, message);
                        if (mergedConfig.playSound && mergedConfig.soundPath) {
                            await sessionNotificationSender.playSessionNotificationSound(ctx, currentPlatform, mergedConfig.soundPath);
                        }
                    }
                }
            }
            return;
        }
        if (event.type === "session.deleted") {
            const sessionInfo = props?.info;
            if (sessionInfo?.id) {
                scheduler.deleteSession(sessionInfo.id);
            }
        }
    };
}
