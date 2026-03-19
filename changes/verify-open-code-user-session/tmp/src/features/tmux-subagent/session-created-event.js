function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function getNestedRecord(value, key) {
    if (!isRecord(value))
        return undefined;
    const nested = value[key];
    return isRecord(nested) ? nested : undefined;
}
function getNestedString(value, key) {
    if (!isRecord(value))
        return undefined;
    const nested = value[key];
    return typeof nested === "string" ? nested : undefined;
}
export function coerceSessionCreatedEvent(input) {
    const properties = isRecord(input.properties) ? input.properties : undefined;
    const info = getNestedRecord(properties, "info");
    return {
        type: input.type,
        properties: info || properties
            ? {
                info: {
                    id: getNestedString(info, "id"),
                    parentID: getNestedString(info, "parentID"),
                    title: getNestedString(info, "title"),
                },
            }
            : undefined,
    };
}
