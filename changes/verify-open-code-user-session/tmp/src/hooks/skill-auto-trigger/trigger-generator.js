import { getAllSkills } from "../../features/opencode-skill-loader/skill-content";
import { buildTriggerRegex, extractKeywordsFromDescription } from "./keyword-extractor";
import { SCOPE_PRIORITY } from "./types";
const TRIGGER_PRIORITY_BOOST = {
    high: 30,
    medium: 0,
    low: -30,
};
/**
 * Generates dynamic skill triggers from all available skills.
 * Called once at plugin initialization, results are cached.
 *
 * @returns Array of SkillTrigger objects sorted by priority (highest first)
 */
export async function generateDynamicTriggers() {
    const allSkills = await getAllSkills();
    const triggers = [];
    for (const skill of allSkills) {
        const description = skill.definition?.description;
        if (!description) {
            continue;
        }
        const explicitTriggerRegex = buildTriggerRegex(skill.triggers ?? []);
        const keywords = explicitTriggerRegex ?? extractKeywordsFromDescription(description);
        if (!keywords) {
            continue;
        }
        const scope = skill.scope;
        const basePriority = SCOPE_PRIORITY[scope] ?? 0;
        const triggerBoost = TRIGGER_PRIORITY_BOOST[skill.triggerPriority ?? "medium"];
        const priority = basePriority + triggerBoost;
        triggers.push({
            skillName: skill.name,
            description,
            keywords,
            priority,
            scope,
        });
    }
    // Sort by priority (highest first)
    triggers.sort((a, b) => b.priority - a.priority);
    return triggers;
}
/**
 * Finds matching skill triggers for user input text.
 * Returns triggers sorted by priority.
 *
 * @param text - User input text to match against
 * @param triggers - Array of skill triggers to search
 * @returns Matching triggers sorted by priority
 */
export function findMatchingTriggers(text, triggers) {
    if (!text || triggers.length === 0) {
        return [];
    }
    return triggers.filter(trigger => trigger.keywords.test(text));
}
