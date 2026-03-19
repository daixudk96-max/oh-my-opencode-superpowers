/**
 * Escape all regex special characters EXCEPT asterisk (*).
 * Asterisk is preserved for glob-to-regex conversion.
 */
function escapeRegexExceptAsterisk(str) {
    // Escape all regex special chars except * (which we convert to .* for glob matching)
    return str.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}
export function matchesToolMatcher(toolName, matcher) {
    if (!matcher) {
        return true;
    }
    const patterns = matcher.split("|").map((p) => p.trim());
    return patterns.some((p) => {
        if (p.includes("*")) {
            // First escape regex special chars (except *), then convert * to .*
            const escaped = escapeRegexExceptAsterisk(p);
            const regex = new RegExp(`^${escaped.replace(/\*/g, ".*")}$`, "i");
            return regex.test(toolName);
        }
        return p.toLowerCase() === toolName.toLowerCase();
    });
}
export function findMatchingHooks(config, eventName, toolName) {
    const hookMatchers = config[eventName];
    if (!hookMatchers)
        return [];
    return hookMatchers.filter((hookMatcher) => {
        if (!toolName)
            return true;
        return matchesToolMatcher(toolName, hookMatcher.matcher);
    });
}
