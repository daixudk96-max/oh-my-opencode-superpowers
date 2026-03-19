import { loadToken, saveToken } from "./storage";
import { discoverOAuthServerMetadata } from "./discovery";
import { getOrRegisterClient } from "./dcr";
import { findAvailablePort } from "./callback-server";
import { buildAuthorizationUrl, generateCodeChallenge, generateCodeVerifier, runAuthorizationCodeRedirect, startCallbackServer, } from "./oauth-authorization-flow";
export class McpOAuthProvider {
    serverUrl;
    configClientId;
    scopes;
    storedCodeVerifier = null;
    storedClientInfo = null;
    callbackPort = null;
    constructor(options) {
        this.serverUrl = options.serverUrl;
        this.configClientId = options.clientId;
        this.scopes = options.scopes ?? [];
    }
    tokens() {
        return loadToken(this.serverUrl, this.serverUrl);
    }
    saveTokens(tokenData) {
        return saveToken(this.serverUrl, this.serverUrl, tokenData);
    }
    clientInformation() {
        if (this.storedClientInfo)
            return this.storedClientInfo;
        const tokenData = this.tokens();
        if (tokenData?.clientInfo) {
            this.storedClientInfo = tokenData.clientInfo;
            return this.storedClientInfo;
        }
        return null;
    }
    redirectUrl() {
        return `http://127.0.0.1:${this.callbackPort ?? 19877}/callback`;
    }
    saveCodeVerifier(verifier) {
        this.storedCodeVerifier = verifier;
    }
    codeVerifier() {
        return this.storedCodeVerifier;
    }
    async redirectToAuthorization(metadata) {
        const clientInfo = this.clientInformation();
        if (!clientInfo) {
            throw new Error("No client information available. Run login() or register a client first.");
        }
        if (this.callbackPort === null) {
            this.callbackPort = await findAvailablePort();
        }
        const result = await runAuthorizationCodeRedirect({
            authorizationEndpoint: metadata.authorizationEndpoint,
            callbackPort: this.callbackPort,
            clientId: clientInfo.clientId,
            redirectUri: this.redirectUrl(),
            scopes: this.scopes,
            resource: metadata.resource,
        });
        this.saveCodeVerifier(result.verifier);
        return { code: result.code };
    }
    async login() {
        const metadata = await discoverOAuthServerMetadata(this.serverUrl);
        const clientRegistrationStorage = {
            getClientRegistration: () => this.storedClientInfo,
            setClientRegistration: (_serverIdentifier, credentials) => {
                this.storedClientInfo = credentials;
            },
        };
        const clientInfo = await getOrRegisterClient({
            registrationEndpoint: metadata.registrationEndpoint,
            serverIdentifier: this.serverUrl,
            clientName: "oh-my-opencode",
            redirectUris: [this.redirectUrl()],
            tokenEndpointAuthMethod: "none",
            clientId: this.configClientId,
            storage: clientRegistrationStorage,
        });
        if (!clientInfo) {
            throw new Error("Failed to obtain client credentials. Provide a clientId or ensure the server supports DCR.");
        }
        this.storedClientInfo = clientInfo;
        const { code } = await this.redirectToAuthorization(metadata);
        const verifier = this.codeVerifier();
        if (!verifier) {
            throw new Error("Code verifier not found");
        }
        const tokenResponse = await fetch(metadata.tokenEndpoint, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: this.redirectUrl(),
                client_id: clientInfo.clientId,
                code_verifier: verifier,
                ...(metadata.resource ? { resource: metadata.resource } : {}),
            }).toString(),
        });
        if (!tokenResponse.ok) {
            let errorDetail = `${tokenResponse.status}`;
            try {
                const body = (await tokenResponse.json());
                if (body.error) {
                    errorDetail = `${tokenResponse.status} ${body.error}`;
                    if (body.error_description) {
                        errorDetail += `: ${body.error_description}`;
                    }
                }
            }
            catch {
                // Response body not JSON
            }
            throw new Error(`Token exchange failed: ${errorDetail}`);
        }
        const tokenData = (await tokenResponse.json());
        const accessToken = tokenData.access_token;
        if (typeof accessToken !== "string") {
            throw new Error("Token response missing access_token");
        }
        const oauthTokenData = {
            accessToken,
            refreshToken: typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : undefined,
            expiresAt: typeof tokenData.expires_in === "number" ? Math.floor(Date.now() / 1000) + tokenData.expires_in : undefined,
            clientInfo: {
                clientId: clientInfo.clientId,
                clientSecret: clientInfo.clientSecret,
            },
        };
        this.saveTokens(oauthTokenData);
        return oauthTokenData;
    }
}
export { generateCodeVerifier, generateCodeChallenge, buildAuthorizationUrl, startCallbackServer };
