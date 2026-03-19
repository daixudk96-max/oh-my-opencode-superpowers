export function createIdleNotificationScheduler(options) {
    const notifiedSessions = new Set();
    const pendingTimers = new Map();
    const sessionActivitySinceIdle = new Set();
    const notificationVersions = new Map();
    const executingNotifications = new Set();
    function cleanupOldSessions() {
        const maxSessions = options.config.maxTrackedSessions;
        if (notifiedSessions.size > maxSessions) {
            const sessionsToRemove = Array.from(notifiedSessions).slice(0, notifiedSessions.size - maxSessions);
            sessionsToRemove.forEach((id) => notifiedSessions.delete(id));
        }
        if (sessionActivitySinceIdle.size > maxSessions) {
            const sessionsToRemove = Array.from(sessionActivitySinceIdle).slice(0, sessionActivitySinceIdle.size - maxSessions);
            sessionsToRemove.forEach((id) => sessionActivitySinceIdle.delete(id));
        }
        if (notificationVersions.size > maxSessions) {
            const sessionsToRemove = Array.from(notificationVersions.keys()).slice(0, notificationVersions.size - maxSessions);
            sessionsToRemove.forEach((id) => notificationVersions.delete(id));
        }
        if (executingNotifications.size > maxSessions) {
            const sessionsToRemove = Array.from(executingNotifications).slice(0, executingNotifications.size - maxSessions);
            sessionsToRemove.forEach((id) => executingNotifications.delete(id));
        }
    }
    function cancelPendingNotification(sessionID) {
        const timer = pendingTimers.get(sessionID);
        if (timer) {
            clearTimeout(timer);
            pendingTimers.delete(sessionID);
        }
        sessionActivitySinceIdle.add(sessionID);
        notificationVersions.set(sessionID, (notificationVersions.get(sessionID) ?? 0) + 1);
    }
    function markSessionActivity(sessionID) {
        cancelPendingNotification(sessionID);
        if (!executingNotifications.has(sessionID)) {
            notifiedSessions.delete(sessionID);
        }
    }
    async function executeNotification(sessionID, version) {
        if (executingNotifications.has(sessionID)) {
            pendingTimers.delete(sessionID);
            return;
        }
        if (notificationVersions.get(sessionID) !== version) {
            pendingTimers.delete(sessionID);
            return;
        }
        if (sessionActivitySinceIdle.has(sessionID)) {
            sessionActivitySinceIdle.delete(sessionID);
            pendingTimers.delete(sessionID);
            return;
        }
        if (notifiedSessions.has(sessionID)) {
            pendingTimers.delete(sessionID);
            return;
        }
        executingNotifications.add(sessionID);
        try {
            if (options.config.skipIfIncompleteTodos) {
                const hasPendingWork = await options.hasIncompleteTodos(options.ctx, sessionID);
                if (notificationVersions.get(sessionID) !== version) {
                    return;
                }
                if (hasPendingWork)
                    return;
            }
            if (notificationVersions.get(sessionID) !== version) {
                return;
            }
            if (sessionActivitySinceIdle.has(sessionID)) {
                sessionActivitySinceIdle.delete(sessionID);
                return;
            }
            notifiedSessions.add(sessionID);
            await options.send(options.ctx, options.platform, options.config.title, options.config.message);
            if (options.config.playSound && options.config.soundPath) {
                await options.playSound(options.ctx, options.platform, options.config.soundPath);
            }
        }
        finally {
            executingNotifications.delete(sessionID);
            pendingTimers.delete(sessionID);
            if (sessionActivitySinceIdle.has(sessionID)) {
                notifiedSessions.delete(sessionID);
                sessionActivitySinceIdle.delete(sessionID);
            }
        }
    }
    function scheduleIdleNotification(sessionID) {
        if (notifiedSessions.has(sessionID))
            return;
        if (pendingTimers.has(sessionID))
            return;
        if (executingNotifications.has(sessionID))
            return;
        sessionActivitySinceIdle.delete(sessionID);
        const currentVersion = (notificationVersions.get(sessionID) ?? 0) + 1;
        notificationVersions.set(sessionID, currentVersion);
        const timer = setTimeout(() => {
            executeNotification(sessionID, currentVersion);
        }, options.config.idleConfirmationDelay);
        pendingTimers.set(sessionID, timer);
        cleanupOldSessions();
    }
    function deleteSession(sessionID) {
        cancelPendingNotification(sessionID);
        notifiedSessions.delete(sessionID);
        sessionActivitySinceIdle.delete(sessionID);
        notificationVersions.delete(sessionID);
        executingNotifications.delete(sessionID);
    }
    return {
        markSessionActivity,
        scheduleIdleNotification,
        deleteSession,
    };
}
