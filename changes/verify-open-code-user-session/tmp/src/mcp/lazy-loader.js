/**
 * Lazy MCP Loader - Shadow MCP implementation
 *
 * Implements lazy loading for MCPs to reduce startup overhead.
 * MCPs are only loaded when first accessed.
 */
/**
 * Creates a lazy MCP registry that supports shadow MCP registration.
 *
 * Shadow MCPs are registered with metadata only and loaded on first access.
 */
export function createLazyMcpRegistry() {
    const entries = new Map();
    function register(config) {
        const status = {
            name: config.name,
            lazy: config.lazy,
            loaded: !config.lazy, // Eager MCPs are marked as loaded immediately
        };
        const loadedConfig = config.lazy
            ? undefined
            : {
                type: config.type,
                url: config.url,
                enabled: config.enabled,
                headers: config.headers,
                oauth: config.oauth,
            };
        if (!config.lazy) {
            status.loadedAt = new Date();
        }
        entries.set(config.name, {
            config,
            status,
            loadedConfig,
        });
    }
    async function get(name) {
        const entry = entries.get(name);
        if (!entry) {
            return undefined;
        }
        // Return cached config if already loaded
        if (entry.loadedConfig) {
            return entry.loadedConfig;
        }
        // Load the MCP
        try {
            // Run validator if provided
            if (entry.config.validator) {
                await entry.config.validator();
            }
            const loadedConfig = {
                type: entry.config.type,
                url: entry.config.url,
                enabled: entry.config.enabled,
                headers: entry.config.headers,
                oauth: entry.config.oauth,
            };
            entry.loadedConfig = loadedConfig;
            entry.status.loaded = true;
            entry.status.loadedAt = new Date();
            return loadedConfig;
        }
        catch (error) {
            entry.status.error =
                error instanceof Error ? error.message : String(error);
            return undefined;
        }
    }
    function getStatus(name) {
        return entries.get(name)?.status;
    }
    function getAllLoaded() {
        const result = {};
        for (const [name, entry] of entries) {
            if (entry.loadedConfig) {
                result[name] = entry.loadedConfig;
            }
        }
        return result;
    }
    function getAllStatuses() {
        return Array.from(entries.values()).map((entry) => entry.status);
    }
    return {
        register,
        get,
        getStatus,
        getAllLoaded,
        getAllStatuses,
    };
}
/**
 * Default timeout for lazy loading MCPs (10 seconds)
 */
export const LAZY_LOAD_TIMEOUT_MS = 10_000;
