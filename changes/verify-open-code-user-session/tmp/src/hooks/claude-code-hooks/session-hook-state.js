export const sessionFirstMessageProcessed = new Set();
export const sessionErrorState = new Map();
export const sessionInterruptState = new Map();
export function clearSessionHookState(sessionID) {
    sessionErrorState.delete(sessionID);
    sessionInterruptState.delete(sessionID);
    sessionFirstMessageProcessed.delete(sessionID);
}
