/**
 * Skill Auto-Injector Hook
 *
 * Automatically injects relevant skills based on detected task types.
 */
import { detectSkillsFromPrompt, DEFAULT_DETECTOR_CONFIG, } from "./detectors";
export const DEFAULT_CONFIG = {
    ...DEFAULT_DETECTOR_CONFIG,
    max_injections: 1,
};
/**
 * Skill content templates (summaries for injection)
 */
const SKILL_SUMMARIES = {
    "git-master": `
[Auto-Injected: git-master]
Use atomic commits, meaningful messages. For history: git log -S, git blame, git bisect.
Delegate git work with: delegate_task(category='quick', load_skills=['git-master'], ...)
`,
    "playwright": `
[Auto-Injected: playwright]
Use Playwright MCP for browser automation. Available actions: navigate, click, fill, screenshot.
Always use the playwright skill for web testing and scraping tasks.
`,
    "frontend-ui-ux": `
[Auto-Injected: frontend-ui-ux]
Focus on user experience, responsive design, accessibility (a11y).
Use modern patterns: component composition, CSS-in-JS, animations.
`,
    "tdd": `
[Auto-Injected: tdd]
Follow RED-GREEN-REFACTOR: Write failing test first, implement minimum to pass, refactor.
Never write implementation before test.
`,
    "systematic-debugging": `
[Auto-Injected: systematic-debugging]
Reproduce → Isolate → Hypothesize → Test → Fix → Verify.
Don't guess - use systematic approach to find root cause.
`,
    "database-optimization": `
[Auto-Injected: database-optimization]
Analyze with EXPLAIN, check indexes, optimize queries.
Consider connection pooling, caching strategies.
`,
    "security-audit": `
[Auto-Injected: security-audit]
Check for XSS, SQL injection, CSRF, auth issues.
Validate inputs, escape outputs, use parameterized queries.
`,
};
/**
 * Create the Skill Auto-Injector Hook
 */
export function createSkillAutoInjectorHook(ctx, options = {}) {
    const config = {
        ...DEFAULT_CONFIG,
        ...options.config,
    };
    // Track injected skills per session to avoid duplicates
    const sessionInjections = new Map();
    return {
        name: "skill-auto-injector",
        "chat.message": async (input, output) => {
            if (!config.enabled) {
                return;
            }
            // Extract prompt text from parts
            const promptText = output.parts
                ?.filter((p) => p.type === "text" && p.text)
                .map((p) => p.text)
                .join("\n")
                .trim() || "";
            if (!promptText) {
                return;
            }
            // Get or create session injection tracker
            if (!sessionInjections.has(input.sessionID)) {
                sessionInjections.set(input.sessionID, new Set());
            }
            const injected = sessionInjections.get(input.sessionID);
            // Detect skills to inject
            const detections = detectSkillsFromPrompt(promptText, config);
            // Filter already injected skills
            const toInject = detections
                .filter(d => !injected.has(d.skill))
                .slice(0, config.max_injections);
            if (toInject.length === 0) {
                return;
            }
            // Inject skill summaries
            output.messages = output.messages || [];
            for (const detection of toInject) {
                const summary = SKILL_SUMMARIES[detection.skill];
                if (summary) {
                    output.messages.push({
                        role: "system",
                        content: summary,
                    });
                    injected.add(detection.skill);
                    if (ctx.log) {
                        ctx.log(`[Skill Auto-Injector] Injected ${detection.skill} (confidence: ${detection.confidence.toFixed(2)})`);
                    }
                }
            }
        },
        event: async (input) => {
            // Clean up on session end
            if (input.event.type === "session.deleted") {
                const sessionInfo = input.event.properties?.info;
                if (sessionInfo?.id) {
                    sessionInjections.delete(sessionInfo.id);
                }
            }
        },
    };
}
export { detectSkillsFromPrompt, getTopSkillToInject } from "./detectors";
