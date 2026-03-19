export function parseGitDiffNumstat(output, statusMap) {
    if (!output)
        return [];
    const stats = [];
    for (const line of output.split("\n")) {
        const parts = line.split("\t");
        if (parts.length < 3)
            continue;
        const [addedStr, removedStr, path] = parts;
        const added = addedStr === "-" ? 0 : parseInt(addedStr, 10);
        const removed = removedStr === "-" ? 0 : parseInt(removedStr, 10);
        stats.push({
            path,
            added,
            removed,
            status: statusMap.get(path) ?? "modified",
        });
    }
    return stats;
}
