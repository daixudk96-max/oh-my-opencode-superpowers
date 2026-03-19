export function createFirstMessageVariantGate() {
    const pending = new Set();
    return {
        markSessionCreated(info) {
            if (info?.id && !info.parentID) {
                pending.add(info.id);
            }
        },
        shouldOverride(sessionID) {
            if (!sessionID)
                return false;
            return pending.has(sessionID);
        },
        markApplied(sessionID) {
            if (!sessionID)
                return;
            pending.delete(sessionID);
        },
        clear(sessionID) {
            if (!sessionID)
                return;
            pending.delete(sessionID);
        },
    };
}
