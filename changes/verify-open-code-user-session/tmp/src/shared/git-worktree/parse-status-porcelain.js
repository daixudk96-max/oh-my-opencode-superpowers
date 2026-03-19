import { parseGitStatusPorcelainLine } from "./parse-status-porcelain-line";
export function parseGitStatusPorcelain(output) {
    const map = new Map();
    if (!output)
        return map;
    for (const line of output.split("\n")) {
        const parsed = parseGitStatusPorcelainLine(line);
        if (!parsed)
            continue;
        map.set(parsed.filePath, parsed.status);
    }
    return map;
}
