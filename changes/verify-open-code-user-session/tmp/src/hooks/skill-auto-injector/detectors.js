/**
 * Skill Auto-Injector Detectors
 *
 * Detects task types from user prompts to auto-inject relevant skills.
 */
export const DEFAULT_DETECTOR_CONFIG = {
    enabled: true,
    disabled_skills: [],
    custom_patterns: {},
};
/**
 * Git-related keywords and patterns
 */
const GIT_PATTERNS = [
    /\bgit\s+(commit|push|pull|merge|rebase|checkout|branch|stash|reset|log|diff|blame|bisect)\b/i,
    /\bcommit\b/i,
    /\brebase\b/i,
    /\bsquash\b/i,
    /\bcherry[- ]?pick\b/i,
    /\bmerge\s+conflict\b/i,
    /\bgit\s+history\b/i,
    /\batomic\s+commit\b/i,
    /\bwho\s+(wrote|added|changed)\b/i,
    /\bwhen\s+was\s+.+\s+added\b/i,
    /\bfind\s+the\s+commit\b/i,
];
/**
 * Browser/Playwright-related keywords
 */
const PLAYWRIGHT_PATTERNS = [
    /\bplaywright\b/i,
    /\bbrowser\s+(automation|test|testing)\b/i,
    /\bweb\s+scraping\b/i,
    /\bscreenshot\b/i,
    /\bheadless\b/i,
    /\bselenium\b/i,
    /\bpuppeteer\b/i,
    /\be2e\s+test/i,
    /\bend[- ]?to[- ]?end\s+test/i,
    /\bclick\s+on\b/i,
    /\bfill\s+(out\s+)?the\s+form\b/i,
    /\bnavigate\s+to\b/i,
    /\bopen\s+(the\s+)?url\b/i,
];
/**
 * Frontend/UI-related keywords
 */
const FRONTEND_PATTERNS = [
    /\bfrontend\b/i,
    /\bui[/ ]?ux\b/i,
    /\breact\b/i,
    /\bvue\b/i,
    /\bsvelte\b/i,
    /\bcomponent\b/i,
    /\bcss\b/i,
    /\btailwind\b/i,
    /\bresponsive\b/i,
    /\banimation\b/i,
    /\bstyling\b/i,
    /\blayout\b/i,
    /\bdesign\s+system\b/i,
    /\baccessibility\b/i,
    /\ba11y\b/i,
];
/**
 * TDD-related keywords
 */
const TDD_PATTERNS = [
    /\btdd\b/i,
    /\btest[- ]?driven\b/i,
    /\bred[- ]?green[- ]?refactor\b/i,
    /\bwrite\s+(a\s+)?test\s+first\b/i,
    /\bfailing\s+test\b/i,
];
/**
 * Debugging-related keywords
 */
const DEBUG_PATTERNS = [
    /\bdebug\b/i,
    /\bbug\b/i,
    /\berror\b/i,
    /\bfix\b/i,
    /\bissue\b/i,
    /\bnot\s+working\b/i,
    /\bbroken\b/i,
    /\bcrash\b/i,
    /\bfailure\b/i,
    /\bwhy\s+(is|does|doesn't)\b/i,
];
/**
 * Database-related keywords
 */
const DATABASE_PATTERNS = [
    /\bdatabase\b/i,
    /\bsql\b/i,
    /\bquery\b/i,
    /\bpostgres\b/i,
    /\bmysql\b/i,
    /\bmongodb\b/i,
    /\bredis\b/i,
    /\bindex\b/i,
    /\boptimiz(e|ation)\b/i,
    /\bslow\s+query\b/i,
];
/**
 * Security-related keywords
 */
const SECURITY_PATTERNS = [
    /\bsecurity\b/i,
    /\bvulnerability\b/i,
    /\baudit\b/i,
    /\bxss\b/i,
    /\bsql\s+injection\b/i,
    /\bcsrf\b/i,
    /\bauthentication\b/i,
    /\bauthorization\b/i,
    /\bencrypt\b/i,
    /\bhash\b/i,
];
/**
 * Count pattern matches in text
 */
function countMatches(text, patterns) {
    return patterns.filter(p => p.test(text)).length;
}
/**
 * Detect skills from user prompt
 */
export function detectSkillsFromPrompt(prompt, config = DEFAULT_DETECTOR_CONFIG) {
    if (!config.enabled) {
        return [];
    }
    const results = [];
    const promptLower = prompt.toLowerCase();
    // Check each skill type
    const skillChecks = [
        { skill: "git-master", patterns: GIT_PATTERNS, minMatches: 1 },
        { skill: "playwright", patterns: PLAYWRIGHT_PATTERNS, minMatches: 1 },
        { skill: "frontend-ui-ux", patterns: FRONTEND_PATTERNS, minMatches: 2 },
        { skill: "tdd", patterns: TDD_PATTERNS, minMatches: 1 },
        { skill: "systematic-debugging", patterns: DEBUG_PATTERNS, minMatches: 2 },
        { skill: "database-optimization", patterns: DATABASE_PATTERNS, minMatches: 2 },
        { skill: "security-audit", patterns: SECURITY_PATTERNS, minMatches: 2 },
    ];
    for (const check of skillChecks) {
        // Skip disabled skills
        if (config.disabled_skills.includes(check.skill)) {
            continue;
        }
        const matchCount = countMatches(prompt, check.patterns);
        if (matchCount >= check.minMatches) {
            const confidence = Math.min(1, matchCount / (check.patterns.length * 0.5));
            results.push({
                skill: check.skill,
                confidence,
                reason: `Matched ${matchCount} pattern(s) for ${check.skill}`,
            });
        }
    }
    // Sort by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);
    return results;
}
/**
 * Get the highest priority skill to inject
 */
export function getTopSkillToInject(prompt, alreadyLoadedSkills = [], config = DEFAULT_DETECTOR_CONFIG) {
    const detections = detectSkillsFromPrompt(prompt, config);
    // Filter out already loaded skills
    const available = detections.filter(d => !alreadyLoadedSkills.includes(d.skill));
    return available.length > 0 ? available[0] : null;
}
