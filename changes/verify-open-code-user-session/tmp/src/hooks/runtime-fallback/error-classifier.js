import { DEFAULT_CONFIG, RETRYABLE_ERROR_PATTERNS } from "./constants";
export function getErrorMessage(error) {
    if (!error)
        return "";
    if (typeof error === "string")
        return error.toLowerCase();
    const errorObj = error;
    const paths = [
        errorObj.data,
        errorObj.error,
        errorObj,
        errorObj.data?.error,
    ];
    for (const obj of paths) {
        if (obj && typeof obj === "object") {
            const msg = obj.message;
            if (typeof msg === "string" && msg.length > 0) {
                return msg.toLowerCase();
            }
        }
    }
    try {
        return JSON.stringify(error).toLowerCase();
    }
    catch {
        return "";
    }
}
export function extractStatusCode(error, retryOnErrors) {
    if (!error)
        return undefined;
    const errorObj = error;
    const statusCode = errorObj.statusCode ?? errorObj.status ?? errorObj.data?.statusCode;
    if (typeof statusCode === "number") {
        return statusCode;
    }
    const codes = retryOnErrors ?? DEFAULT_CONFIG.retry_on_errors;
    const pattern = new RegExp(`\\b(${codes.join("|")})\\b`);
    const message = getErrorMessage(error);
    const statusMatch = message.match(pattern);
    if (statusMatch) {
        return parseInt(statusMatch[1], 10);
    }
    return undefined;
}
export function extractErrorName(error) {
    if (!error || typeof error !== "object")
        return undefined;
    const errorObj = error;
    const directName = errorObj.name;
    if (typeof directName === "string" && directName.length > 0) {
        return directName;
    }
    const nestedError = errorObj.error;
    const nestedName = nestedError?.name;
    if (typeof nestedName === "string" && nestedName.length > 0) {
        return nestedName;
    }
    const dataError = errorObj.data?.error;
    const dataErrorName = dataError?.name;
    if (typeof dataErrorName === "string" && dataErrorName.length > 0) {
        return dataErrorName;
    }
    return undefined;
}
export function classifyErrorType(error) {
    const message = getErrorMessage(error);
    const errorName = extractErrorName(error)?.toLowerCase();
    if (errorName?.includes("loadapi") ||
        (/api.?key.?is.?missing/i.test(message) && /environment variable/i.test(message))) {
        return "missing_api_key";
    }
    if (/api.?key/i.test(message) && /must be a string/i.test(message)) {
        return "invalid_api_key";
    }
    if (errorName?.includes("unknownerror") && /model\s+not\s+found/i.test(message)) {
        return "model_not_found";
    }
    return undefined;
}
export const AUTO_RETRY_PATTERNS = [
    (combined) => /retrying\s+in/i.test(combined),
    (combined) => /(?:too\s+many\s+requests|quota\s*exceeded|usage\s+limit|rate\s+limit|limit\s+reached)/i.test(combined),
];
export function extractAutoRetrySignal(info) {
    if (!info)
        return undefined;
    const candidates = [];
    const directStatus = info.status;
    if (typeof directStatus === "string")
        candidates.push(directStatus);
    const summary = info.summary;
    if (typeof summary === "string")
        candidates.push(summary);
    const message = info.message;
    if (typeof message === "string")
        candidates.push(message);
    const details = info.details;
    if (typeof details === "string")
        candidates.push(details);
    const combined = candidates.join("\n");
    if (!combined)
        return undefined;
    const isAutoRetry = AUTO_RETRY_PATTERNS.every((test) => test(combined));
    if (isAutoRetry) {
        return { signal: combined };
    }
    return undefined;
}
export function containsErrorContent(parts) {
    if (!parts || parts.length === 0)
        return { hasError: false };
    const errorParts = parts.filter((p) => p.type === "error");
    if (errorParts.length > 0) {
        const errorMessages = errorParts.map((p) => p.text).filter((text) => typeof text === "string");
        const errorMessage = errorMessages.length > 0 ? errorMessages.join("\n") : undefined;
        return { hasError: true, errorMessage };
    }
    return { hasError: false };
}
export function isRetryableError(error, retryOnErrors) {
    const statusCode = extractStatusCode(error, retryOnErrors);
    const message = getErrorMessage(error);
    const errorType = classifyErrorType(error);
    if (errorType === "missing_api_key") {
        return true;
    }
    if (errorType === "model_not_found") {
        return true;
    }
    if (statusCode && retryOnErrors.includes(statusCode)) {
        return true;
    }
    return RETRYABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}
