export function getMessageCount(data) {
    return Array.isArray(data) ? data.length : 0;
}
