import { log } from "../../shared";
import { getMainSessionID } from "../../features/claude-code-session-state";
import { HOOK_NAME, SKILL_SUGGESTIONS, SKILL_MENTION_PATTERNS } from "./constants";
export * from "./constants";
/**
 * Extracts text content from message parts.
 */
function extractPromptText(parts) {
    return parts
        .filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join(" ");
}
/**
 * Removes code blocks to avoid false positives from code content.
 */
function removeCodeBlocks(text) {
    return text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`[^`]+`/g, "");
}
/**
 * Detects which skills should be suggested based on prompt keywords.
 * Filters out skills already mentioned in the prompt.
 */
function detectSkillSuggestions(text) {
    const cleanText = removeCodeBlocks(text);
    const suggestions = [];
    for (const { skill, keywords, suggestion } of SKILL_SUGGESTIONS) {
        // Check if keyword matches
        if (!keywords.test(cleanText)) {
            continue;
        }
        // Check if skill is already mentioned (user/agent already knows about it)
        const mentionPattern = SKILL_MENTION_PATTERNS[skill];
        if (mentionPattern && mentionPattern.test(text)) {
            continue;
        }
        suggestions.push({ skill, suggestion });
    }
    return suggestions;
}
/**
 * Creates the skill suggestion hook.
 *
 * This hook detects keywords in user prompts and suggests relevant skills
 * to improve workflow quality. Suggestions are non-blocking and only shown
 * once per skill per session.
 */
export function createSkillSuggestionHook(ctx) {
    // Track suggested skills per session to avoid repetition
    const suggestedSkillsPerSession = new Map();
    return {
        "chat.message": async (input, output) => {
            const promptText = extractPromptText(output.parts);
            if (!promptText.trim()) {
                return;
            }
            // Only suggest in main session to avoid noise in subagent sessions
            const mainSessionID = getMainSessionID();
            if (mainSessionID && input.sessionID !== mainSessionID) {
                return;
            }
            // Detect applicable skill suggestions
            const suggestions = detectSkillSuggestions(promptText);
            if (suggestions.length === 0) {
                return;
            }
            // Get or create the set of already-suggested skills for this session
            let suggestedSkills = suggestedSkillsPerSession.get(input.sessionID);
            if (!suggestedSkills) {
                suggestedSkills = new Set();
                suggestedSkillsPerSession.set(input.sessionID, suggestedSkills);
            }
            // Filter out already-suggested skills
            const newSuggestions = suggestions.filter((s) => !suggestedSkills.has(s.skill));
            if (newSuggestions.length === 0) {
                return;
            }
            // Mark these skills as suggested
            for (const s of newSuggestions) {
                suggestedSkills.add(s.skill);
            }
            // Show toast notification for each suggestion
            for (const { skill, suggestion } of newSuggestions) {
                ctx.client.tui
                    .showToast({
                    body: {
                        title: `Skill Suggestion: ${skill}`,
                        message: suggestion,
                        variant: "info",
                        duration: 5000,
                    },
                })
                    .catch((err) => log(`[${HOOK_NAME}] Failed to show toast`, { error: err, sessionID: input.sessionID }));
            }
            log(`[${HOOK_NAME}] Suggested ${newSuggestions.length} skills`, {
                sessionID: input.sessionID,
                skills: newSuggestions.map((s) => s.skill),
            });
        },
    };
}
