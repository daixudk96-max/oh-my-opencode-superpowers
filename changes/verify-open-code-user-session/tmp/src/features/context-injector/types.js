/**
 * Default source order for cache-friendly injection
 * Static content first, dynamic content last
 */
export const DEFAULT_SOURCE_ORDER = [
    "system",
    "directory-agents",
    "directory-readme",
    "rules-injector",
    "skills",
    "keyword-detector",
    "agent-skill-reminder",
    "dynamic",
    "custom",
];
