export function isRecord(value) {
    return typeof value === "object" && value !== null;
}
export function isAbortedSessionError(error) {
    const message = getErrorText(error);
    return message.toLowerCase().includes("aborted");
}
export function getErrorText(error) {
    if (!error)
        return "";
    if (typeof error === "string")
        return error;
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }
    if (typeof error === "object" && error !== null) {
        if ("message" in error && typeof error.message === "string") {
            return error.message;
        }
        if ("name" in error && typeof error.name === "string") {
            return error.name;
        }
    }
    return "";
}
export function extractErrorName(error) {
    if (isRecord(error) && typeof error["name"] === "string")
        return error["name"];
    if (error instanceof Error)
        return error.name;
    return undefined;
}
export function extractErrorMessage(error) {
    if (!error)
        return undefined;
    if (typeof error === "string")
        return error;
    if (error instanceof Error)
        return error.message;
    if (isRecord(error)) {
        const dataRaw = error["data"];
        const candidates = [
            error,
            dataRaw,
            error["error"],
            isRecord(dataRaw) ? dataRaw["error"] : undefined,
            error["cause"],
        ];
        for (const candidate of candidates) {
            if (typeof candidate === "string" && candidate.length > 0)
                return candidate;
            if (isRecord(candidate) &&
                typeof candidate["message"] === "string" &&
                candidate["message"].length > 0) {
                return candidate["message"];
            }
        }
    }
    try {
        return JSON.stringify(error);
    }
    catch {
        return String(error);
    }
}
export function getSessionErrorMessage(properties) {
    const errorRaw = properties["error"];
    if (!isRecord(errorRaw))
        return undefined;
    const dataRaw = errorRaw["data"];
    if (isRecord(dataRaw)) {
        const message = dataRaw["message"];
        if (typeof message === "string")
            return message;
    }
    const message = errorRaw["message"];
    return typeof message === "string" ? message : undefined;
}
