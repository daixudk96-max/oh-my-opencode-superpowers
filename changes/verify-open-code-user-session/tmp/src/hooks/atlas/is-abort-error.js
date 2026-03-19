export function isAbortError(error) {
    if (!error)
        return false;
    if (typeof error === "object") {
        const errObj = error;
        const name = errObj.name;
        const message = errObj.message?.toLowerCase() ?? "";
        if (name === "MessageAbortedError" || name === "AbortError")
            return true;
        if (name === "DOMException" && message.includes("abort"))
            return true;
        if (message.includes("aborted") || message.includes("cancelled") || message.includes("interrupted"))
            return true;
    }
    if (typeof error === "string") {
        const lower = error.toLowerCase();
        return lower.includes("abort") || lower.includes("cancel") || lower.includes("interrupt");
    }
    return false;
}
