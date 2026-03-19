const DEFAULT_HTTP_HOOK_TIMEOUT_S = 30;
const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
export function interpolateEnvVars(value, allowedEnvVars) {
    const allowedSet = new Set(allowedEnvVars);
    return value.replace(/\$\{(\w+)\}|\$(\w+)/g, (_match, bracedVar, bareVar) => {
        const varName = (bracedVar ?? bareVar);
        if (allowedSet.has(varName)) {
            return process.env[varName] ?? "";
        }
        return "";
    });
}
function resolveHeaders(hook) {
    const headers = {
        "Content-Type": "application/json",
    };
    if (!hook.headers)
        return headers;
    const allowedEnvVars = hook.allowedEnvVars ?? [];
    for (const [key, value] of Object.entries(hook.headers)) {
        headers[key] = interpolateEnvVars(value, allowedEnvVars);
    }
    return headers;
}
export async function executeHttpHook(hook, stdin) {
    try {
        const parsed = new URL(hook.url);
        if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
            return {
                exitCode: 1,
                stderr: `HTTP hook URL scheme "${parsed.protocol}" is not allowed. Only http: and https: are permitted.`,
            };
        }
    }
    catch {
        return { exitCode: 1, stderr: `HTTP hook URL is invalid: ${hook.url}` };
    }
    const timeoutS = hook.timeout ?? DEFAULT_HTTP_HOOK_TIMEOUT_S;
    const headers = resolveHeaders(hook);
    try {
        const response = await fetch(hook.url, {
            method: "POST",
            headers,
            body: stdin,
            signal: AbortSignal.timeout(timeoutS * 1000),
        });
        if (!response.ok) {
            return {
                exitCode: 1,
                stderr: `HTTP hook returned status ${response.status}: ${response.statusText}`,
                stdout: await response.text().catch(() => ""),
            };
        }
        const body = await response.text();
        if (!body) {
            return { exitCode: 0, stdout: "", stderr: "" };
        }
        try {
            const parsed = JSON.parse(body);
            if (typeof parsed.exitCode === "number") {
                return { exitCode: parsed.exitCode, stdout: body, stderr: "" };
            }
        }
        catch {
        }
        return { exitCode: 0, stdout: body, stderr: "" };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { exitCode: 1, stderr: `HTTP hook error: ${message}` };
    }
}
