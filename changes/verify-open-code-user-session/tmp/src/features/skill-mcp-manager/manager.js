import { disconnectAll, disconnectSession, forceReconnect } from "./cleanup";
import { getOrCreateClient, getOrCreateClientWithRetryImpl } from "./connection";
import { handleStepUpIfNeeded } from "./oauth-handler";
export class SkillMcpManager {
    state = {
        clients: new Map(),
        pendingConnections: new Map(),
        authProviders: new Map(),
        cleanupRegistered: false,
        cleanupInterval: null,
        cleanupHandlers: [],
        idleTimeoutMs: 5 * 60 * 1000,
    };
    getClientKey(info) {
        return `${info.sessionID}:${info.skillName}:${info.serverName}`;
    }
    async getOrCreateClient(info, config) {
        const clientKey = this.getClientKey(info);
        return await getOrCreateClient({
            state: this.state,
            clientKey,
            info,
            config,
        });
    }
    async disconnectSession(sessionID) {
        await disconnectSession(this.state, sessionID);
    }
    async disconnectAll() {
        await disconnectAll(this.state);
    }
    async listTools(info, context) {
        const client = await this.getOrCreateClientWithRetry(info, context.config);
        const result = await client.listTools();
        return result.tools;
    }
    async listResources(info, context) {
        const client = await this.getOrCreateClientWithRetry(info, context.config);
        const result = await client.listResources();
        return result.resources;
    }
    async listPrompts(info, context) {
        const client = await this.getOrCreateClientWithRetry(info, context.config);
        const result = await client.listPrompts();
        return result.prompts;
    }
    async callTool(info, context, name, args) {
        return await this.withOperationRetry(info, context.config, async (client) => {
            const result = await client.callTool({ name, arguments: args });
            return result.content;
        });
    }
    async readResource(info, context, uri) {
        return await this.withOperationRetry(info, context.config, async (client) => {
            const result = await client.readResource({ uri });
            return result.contents;
        });
    }
    async getPrompt(info, context, name, args) {
        return await this.withOperationRetry(info, context.config, async (client) => {
            const result = await client.getPrompt({ name, arguments: args });
            return result.messages;
        });
    }
    async withOperationRetry(info, config, operation) {
        const maxRetries = 3;
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const client = await this.getOrCreateClientWithRetry(info, config);
                return await operation(client);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const errorMessage = lastError.message.toLowerCase();
                const stepUpHandled = await handleStepUpIfNeeded({
                    error: lastError,
                    config,
                    authProviders: this.state.authProviders,
                });
                if (stepUpHandled) {
                    await forceReconnect(this.state, this.getClientKey(info));
                    continue;
                }
                if (!errorMessage.includes("not connected")) {
                    throw lastError;
                }
                if (attempt === maxRetries) {
                    throw new Error(`Failed after ${maxRetries} reconnection attempts: ${lastError.message}`);
                }
                await forceReconnect(this.state, this.getClientKey(info));
            }
        }
        throw lastError ?? new Error("Operation failed with unknown error");
    }
    // NOTE: tests spy on this exact method name via `spyOn(manager as any, 'getOrCreateClientWithRetry')`.
    async getOrCreateClientWithRetry(info, config) {
        const clientKey = this.getClientKey(info);
        return await getOrCreateClientWithRetryImpl({
            state: this.state,
            clientKey,
            info,
            config,
        });
    }
    getConnectedServers() {
        return Array.from(this.state.clients.keys());
    }
    isConnected(info) {
        return this.state.clients.has(this.getClientKey(info));
    }
}
