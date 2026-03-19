export function normalizeSDKResponse(response, fallback, options) {
    if (response === null || response === undefined) {
        return fallback;
    }
    if (Array.isArray(response)) {
        return response;
    }
    if (typeof response === "object" && "data" in response) {
        const data = response.data;
        if (data !== null && data !== undefined) {
            return data;
        }
        if (options?.preferResponseOnMissingData === true) {
            return response;
        }
        return fallback;
    }
    if (options?.preferResponseOnMissingData === true) {
        return response;
    }
    return fallback;
}
