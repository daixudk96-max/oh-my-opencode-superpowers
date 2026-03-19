export function matchesTrigger(instinct, input) {
    if (!instinct.trigger)
        return false;
    const triggerLower = instinct.trigger.toLowerCase();
    const inputLower = input.toLowerCase();
    return inputLower.includes(triggerLower);
}
export function filterByConfidence(instincts, threshold = 0.7) {
    return instincts.filter(i => i.confidence >= threshold);
}
export function extractActionSection(markdown) {
    // Match "## Action" followed by content until next heading, delimiter, or end of string
    const actionMatch = markdown.match(/^## Action\s*\n([\s\S]*?)(?=\n##|\n---|$)/m);
    return actionMatch ? actionMatch[1].trim() : undefined;
}
