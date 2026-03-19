let serverAvailable = null;
let serverCheckUrl = null;
function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
export async function isServerRunning(serverUrl) {
    if (serverCheckUrl === serverUrl && serverAvailable === true) {
        return true;
    }
    const healthUrl = new URL("/health", serverUrl).toString();
    const timeoutMs = 3000;
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(healthUrl, {
                signal: controller.signal,
            }).catch(() => null);
            clearTimeout(timeout);
            if (response?.ok) {
                serverCheckUrl = serverUrl;
                serverAvailable = true;
                return true;
            }
        }
        finally {
            clearTimeout(timeout);
        }
        if (attempt < maxAttempts) {
            await delay(250);
        }
    }
    return false;
}
export function resetServerCheck() {
    serverAvailable = null;
    serverCheckUrl = null;
}
