/**
 * Session Category Registry
 *
 * Maintains a mapping of session IDs to their assigned categories.
 * Used by runtime-fallback hook to lookup category-specific fallback_models.
 */
// Map of sessionID -> category name
const sessionCategoryMap = new Map();
export const SessionCategoryRegistry = {
    /**
     * Register a session with its category
     */
    register: (sessionID, category) => {
        sessionCategoryMap.set(sessionID, category);
    },
    /**
     * Get the category for a session
     */
    get: (sessionID) => {
        return sessionCategoryMap.get(sessionID);
    },
    /**
     * Remove a session from the registry (cleanup)
     */
    remove: (sessionID) => {
        sessionCategoryMap.delete(sessionID);
    },
    /**
     * Check if a session is registered
     */
    has: (sessionID) => {
        return sessionCategoryMap.has(sessionID);
    },
    /**
     * Get the size of the registry (for debugging)
     */
    size: () => {
        return sessionCategoryMap.size;
    },
    /**
     * Clear all entries (use with caution, mainly for testing)
     */
    clear: () => {
        sessionCategoryMap.clear();
    },
};
