export function parseSessionStatusMap(data) {
    if (typeof data !== "object" || data === null)
        return {};
    const record = data;
    const result = {};
    for (const [sessionId, value] of Object.entries(record)) {
        if (typeof value !== "object" || value === null)
            continue;
        const valueRecord = value;
        const type = valueRecord["type"];
        if (typeof type !== "string")
            continue;
        result[sessionId] = { type };
    }
    return result;
}
