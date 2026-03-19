/**
 * Background notification hook - handles event routing to BackgroundManager.
 *
 * Notifications are now delivered directly via session.prompt({ noReply })
 * from the manager, so this hook only needs to handle event routing.
 */
export function createBackgroundNotificationHook(manager) {
    const eventHandler = async ({ event }) => {
        manager.handleEvent(event);
    };
    const chatMessageHandler = async (input, output) => {
        manager.injectPendingNotificationsIntoChatMessage(output, input.sessionID);
    };
    return {
        "chat.message": chatMessageHandler,
        event: eventHandler,
    };
}
