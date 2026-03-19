/**
 * SessionHandler for TDD Guard session lifecycle
 *
 * Initializes TDD Guard state when a session starts.
 * Loads enabled state from Storage and clears transient data.
 */
const TDD_ENABLED_KEY = 'tdd_guard_enabled';
/**
 * Handles session lifecycle events for TDD Guard.
 * On session start, clears transient data and initializes state.
 */
export class SessionHandler {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Process a session start event.
     * Clears transient data to start fresh for the new session.
     *
     * @param hookData JSON string containing session start event data
     */
    async processSessionStart(hookData) {
        // #given a session start event
        // #when processing the event
        // #then clear transient data and initialize state
        let parsedData;
        try {
            parsedData = JSON.parse(hookData);
        }
        catch {
            return; // Invalid JSON, ignore
        }
        if (!this.isSessionStartData(parsedData)) {
            return; // Not a session start event
        }
        // Clear transient data for the new session
        await this.storage.clearTransientData();
    }
    /**
     * Check if TDD Guard is currently enabled for this session.
     * Reads from persisted config.
     */
    async isEnabled() {
        const config = await this.storage.getConfig();
        if (!config) {
            return true; // Default: enabled
        }
        try {
            const parsed = JSON.parse(config);
            return parsed[TDD_ENABLED_KEY] !== false;
        }
        catch {
            return true; // Default: enabled on parse error
        }
    }
    /**
     * Type guard for SessionStartData
     */
    isSessionStartData(data) {
        if (typeof data !== 'object' || data === null) {
            return false;
        }
        const obj = data;
        return (obj.type === 'session_start' &&
            (obj.source === 'startup' || obj.source === 'resume' || obj.source === 'clear'));
    }
}
