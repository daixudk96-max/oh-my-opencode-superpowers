const pendingCalls = new Map();
const PENDING_CALL_TTL = 60_000;
let cleanupIntervalStarted = false;
let cleanupInterval;
function cleanupOldPendingCalls() {
    const now = Date.now();
    for (const [callID, call] of pendingCalls) {
        if (now - call.timestamp > PENDING_CALL_TTL) {
            pendingCalls.delete(callID);
        }
    }
}
export function startPendingCallCleanup() {
    if (cleanupIntervalStarted)
        return;
    cleanupIntervalStarted = true;
    cleanupInterval = setInterval(cleanupOldPendingCalls, 10_000);
    if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
        cleanupInterval.unref();
    }
}
export function registerPendingCall(callID, pendingCall) {
    pendingCalls.set(callID, pendingCall);
}
export function takePendingCall(callID) {
    const pendingCall = pendingCalls.get(callID);
    if (!pendingCall)
        return undefined;
    pendingCalls.delete(callID);
    return pendingCall;
}
