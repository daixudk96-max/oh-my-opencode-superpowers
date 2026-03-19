export function normalizeSessionStatusToIdle(input) {
    if (input.event.type !== "session.status")
        return null;
    const props = input.event.properties;
    if (!props)
        return null;
    const status = props.status;
    if (!status || status.type !== "idle")
        return null;
    const sessionID = props.sessionID;
    if (!sessionID)
        return null;
    return {
        event: {
            type: "session.idle",
            properties: { sessionID },
        },
    };
}
