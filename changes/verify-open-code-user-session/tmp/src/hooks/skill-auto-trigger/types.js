/**
 * Priority mapping for skill scopes.
 * Higher priority skills are suggested first when multiple match.
 */
export const SCOPE_PRIORITY = {
    builtin: 100,
    "opencode-project": 80, // Project-level skills take precedence
    opencode: 60,
    user: 40,
    project: 20,
    config: 10,
};
/**
 * Empty cache constant
 */
export const EMPTY_CACHE = {
    version: "1.0",
    generatedAt: "",
    skills: {}
};
export const HOOK_NAME = "skill-auto-trigger";
