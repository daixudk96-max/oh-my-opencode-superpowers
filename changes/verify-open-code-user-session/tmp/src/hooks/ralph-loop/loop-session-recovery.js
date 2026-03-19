export function createLoopSessionRecovery(options) {
    const recoveryWindowMs = options?.recoveryWindowMs ?? 5000;
    const sessions = new Map();
    function getSessionState(sessionID) {
        let state = sessions.get(sessionID);
        if (!state) {
            state = {};
            sessions.set(sessionID, state);
        }
        return state;
    }
    return {
        isRecovering(sessionID) {
            return getSessionState(sessionID).isRecovering === true;
        },
        markRecovering(sessionID) {
            const state = getSessionState(sessionID);
            state.isRecovering = true;
            setTimeout(() => {
                state.isRecovering = false;
            }, recoveryWindowMs);
        },
        clear(sessionID) {
            sessions.delete(sessionID);
        },
    };
}
