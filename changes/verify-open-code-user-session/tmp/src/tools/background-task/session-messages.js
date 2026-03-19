export function getErrorMessage(value) {
    if (Array.isArray(value))
        return null;
    if (value.error === undefined || value.error === null)
        return null;
    if (typeof value.error === "string" && value.error.length > 0)
        return value.error;
    return String(value.error);
}
function isSessionMessage(value) {
    return typeof value === "object" && value !== null;
}
export function extractMessages(value) {
    if (Array.isArray(value)) {
        return value.filter(isSessionMessage);
    }
    if (Array.isArray(value.data)) {
        return value.data.filter(isSessionMessage);
    }
    return [];
}
