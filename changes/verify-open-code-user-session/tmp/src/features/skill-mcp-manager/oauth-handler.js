import { McpOAuthProvider } from "../mcp-oauth/provider";
import { isStepUpRequired, mergeScopes } from "../mcp-oauth/step-up";
export function getOrCreateAuthProvider(authProviders, serverUrl, oauth) {
    const existing = authProviders.get(serverUrl);
    if (existing)
        return existing;
    const provider = new McpOAuthProvider({
        serverUrl,
        clientId: oauth.clientId,
        scopes: oauth.scopes,
    });
    authProviders.set(serverUrl, provider);
    return provider;
}
function isTokenExpired(tokenData) {
    if (tokenData.expiresAt == null)
        return false;
    return tokenData.expiresAt < Math.floor(Date.now() / 1000);
}
export async function buildHttpRequestInit(config, authProviders) {
    const headers = {};
    if (config.headers) {
        for (const [key, value] of Object.entries(config.headers)) {
            headers[key] = value;
        }
    }
    if (config.oauth && config.url) {
        const provider = getOrCreateAuthProvider(authProviders, config.url, config.oauth);
        let tokenData = provider.tokens();
        if (!tokenData || isTokenExpired(tokenData)) {
            try {
                tokenData = await provider.login();
            }
            catch {
                tokenData = null;
            }
        }
        if (tokenData) {
            headers.Authorization = `Bearer ${tokenData.accessToken}`;
        }
    }
    return Object.keys(headers).length > 0 ? { headers } : undefined;
}
export async function handleStepUpIfNeeded(params) {
    const { error, config, authProviders } = params;
    if (!config.oauth || !config.url) {
        return false;
    }
    const statusMatch = /\b403\b/.exec(error.message);
    if (!statusMatch) {
        return false;
    }
    const headers = {};
    const wwwAuthMatch = /WWW-Authenticate:\s*(.+)/i.exec(error.message);
    if (wwwAuthMatch?.[1]) {
        headers["www-authenticate"] = wwwAuthMatch[1];
    }
    const stepUp = isStepUpRequired(403, headers);
    if (!stepUp) {
        return false;
    }
    const currentScopes = config.oauth.scopes ?? [];
    const mergedScopes = mergeScopes(currentScopes, stepUp.requiredScopes);
    config.oauth.scopes = mergedScopes;
    authProviders.delete(config.url);
    const provider = getOrCreateAuthProvider(authProviders, config.url, config.oauth);
    try {
        await provider.login();
        return true;
    }
    catch {
        return false;
    }
}
