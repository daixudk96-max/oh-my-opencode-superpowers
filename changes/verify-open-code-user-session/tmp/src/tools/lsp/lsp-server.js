import { LSPClient } from "./lsp-client";
import { registerLspManagerProcessCleanup } from "./lsp-manager-process-cleanup";
import { cleanupTempDirectoryLspClients } from "./lsp-manager-temp-directory-cleanup";
class LSPServerManager {
    static instance;
    clients = new Map();
    cleanupInterval = null;
    IDLE_TIMEOUT = 5 * 60 * 1000;
    INIT_TIMEOUT = 60 * 1000;
    cleanupHandle = null;
    constructor() {
        this.startCleanupTimer();
        this.registerProcessCleanup();
    }
    registerProcessCleanup() {
        this.cleanupHandle = registerLspManagerProcessCleanup({
            getClients: () => this.clients.entries(),
            clearClients: () => {
                this.clients.clear();
            },
            clearCleanupInterval: () => {
                if (this.cleanupInterval) {
                    clearInterval(this.cleanupInterval);
                    this.cleanupInterval = null;
                }
            },
        });
    }
    static getInstance() {
        if (!LSPServerManager.instance) {
            LSPServerManager.instance = new LSPServerManager();
        }
        return LSPServerManager.instance;
    }
    getKey(root, serverId) {
        return `${root}::${serverId}`;
    }
    startCleanupTimer() {
        if (this.cleanupInterval)
            return;
        this.cleanupInterval = setInterval(() => {
            this.cleanupIdleClients();
        }, 60000);
    }
    cleanupIdleClients() {
        const now = Date.now();
        for (const [key, managed] of this.clients) {
            if (managed.refCount === 0 && now - managed.lastUsedAt > this.IDLE_TIMEOUT) {
                managed.client.stop();
                this.clients.delete(key);
            }
        }
    }
    async getClient(root, server) {
        const key = this.getKey(root, server.id);
        let managed = this.clients.get(key);
        if (managed) {
            const now = Date.now();
            if (managed.isInitializing &&
                managed.initializingSince !== undefined &&
                now - managed.initializingSince >= this.INIT_TIMEOUT) {
                // Stale init can permanently block subsequent calls (e.g., LSP process hang)
                try {
                    await managed.client.stop();
                }
                catch { }
                this.clients.delete(key);
                managed = undefined;
            }
        }
        if (managed) {
            if (managed.initPromise) {
                try {
                    await managed.initPromise;
                }
                catch {
                    // Failed init should not keep the key blocked forever.
                    try {
                        await managed.client.stop();
                    }
                    catch { }
                    this.clients.delete(key);
                    managed = undefined;
                }
            }
            if (managed) {
                if (managed.client.isAlive()) {
                    managed.refCount++;
                    managed.lastUsedAt = Date.now();
                    return managed.client;
                }
                try {
                    await managed.client.stop();
                }
                catch { }
                this.clients.delete(key);
            }
        }
        const client = new LSPClient(root, server);
        const initPromise = (async () => {
            await client.start();
            await client.initialize();
        })();
        const initStartedAt = Date.now();
        this.clients.set(key, {
            client,
            lastUsedAt: initStartedAt,
            refCount: 1,
            initPromise,
            isInitializing: true,
            initializingSince: initStartedAt,
        });
        try {
            await initPromise;
        }
        catch (error) {
            this.clients.delete(key);
            try {
                await client.stop();
            }
            catch { }
            throw error;
        }
        const m = this.clients.get(key);
        if (m) {
            m.initPromise = undefined;
            m.isInitializing = false;
            m.initializingSince = undefined;
        }
        return client;
    }
    warmupClient(root, server) {
        const key = this.getKey(root, server.id);
        if (this.clients.has(key))
            return;
        const client = new LSPClient(root, server);
        const initPromise = (async () => {
            await client.start();
            await client.initialize();
        })();
        const initStartedAt = Date.now();
        this.clients.set(key, {
            client,
            lastUsedAt: initStartedAt,
            refCount: 0,
            initPromise,
            isInitializing: true,
            initializingSince: initStartedAt,
        });
        initPromise
            .then(() => {
            const m = this.clients.get(key);
            if (m) {
                m.initPromise = undefined;
                m.isInitializing = false;
                m.initializingSince = undefined;
            }
        })
            .catch(() => {
            // Warmup failures must not permanently block future initialization.
            this.clients.delete(key);
            void client.stop().catch(() => { });
        });
    }
    releaseClient(root, serverId) {
        const key = this.getKey(root, serverId);
        const managed = this.clients.get(key);
        if (managed && managed.refCount > 0) {
            managed.refCount--;
            managed.lastUsedAt = Date.now();
        }
    }
    isServerInitializing(root, serverId) {
        const key = this.getKey(root, serverId);
        const managed = this.clients.get(key);
        return managed?.isInitializing ?? false;
    }
    async stopAll() {
        this.cleanupHandle?.unregister();
        this.cleanupHandle = null;
        for (const [, managed] of this.clients) {
            await managed.client.stop();
        }
        this.clients.clear();
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
    async cleanupTempDirectoryClients() {
        await cleanupTempDirectoryLspClients(this.clients);
    }
}
export const lspManager = LSPServerManager.getInstance();
