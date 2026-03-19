const COMMAND_PATTERN = /!`([^`]+)`/g;
export function findEmbeddedCommands(text) {
    const matches = [];
    let match;
    COMMAND_PATTERN.lastIndex = 0;
    while ((match = COMMAND_PATTERN.exec(text)) !== null) {
        matches.push({
            fullMatch: match[0],
            command: match[1],
            start: match.index,
            end: match.index + match[0].length,
        });
    }
    return matches;
}
