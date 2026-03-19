export function getOrCreateRetryState(autoCompactState, sessionID) {
    let state = autoCompactState.retryStateBySession.get(sessionID);
    if (!state) {
        state = { attempt: 0, lastAttemptTime: 0, firstAttemptTime: 0 };
        autoCompactState.retryStateBySession.set(sessionID, state);
    }
    return state;
}
export function getOrCreateTruncateState(autoCompactState, sessionID) {
    let state = autoCompactState.truncateStateBySession.get(sessionID);
    if (!state) {
        state = { truncateAttempt: 0 };
        autoCompactState.truncateStateBySession.set(sessionID, state);
    }
    return state;
}
export function clearSessionState(autoCompactState, sessionID) {
    autoCompactState.pendingCompact.delete(sessionID);
    autoCompactState.errorDataBySession.delete(sessionID);
    autoCompactState.retryStateBySession.delete(sessionID);
    autoCompactState.truncateStateBySession.delete(sessionID);
    autoCompactState.emptyContentAttemptBySession.delete(sessionID);
    autoCompactState.compactionInProgress.delete(sessionID);
}
export function getEmptyContentAttempt(autoCompactState, sessionID) {
    return autoCompactState.emptyContentAttemptBySession.get(sessionID) ?? 0;
}
export function incrementEmptyContentAttempt(autoCompactState, sessionID) {
    const attempt = getEmptyContentAttempt(autoCompactState, sessionID);
    autoCompactState.emptyContentAttemptBySession.set(sessionID, attempt + 1);
    return attempt;
}
