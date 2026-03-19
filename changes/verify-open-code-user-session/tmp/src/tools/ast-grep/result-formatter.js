export function formatSearchResult(result) {
    if (result.error) {
        return `Error: ${result.error}`;
    }
    if (result.matches.length === 0) {
        return "No matches found";
    }
    const lines = [];
    if (result.truncated) {
        const reason = result.truncatedReason === "max_matches"
            ? `showing first ${result.matches.length} of ${result.totalMatches}`
            : result.truncatedReason === "max_output_bytes"
                ? "output exceeded 1MB limit"
                : "search timed out";
        lines.push(`[TRUNCATED] Results truncated (${reason})\n`);
    }
    lines.push(`Found ${result.matches.length} match(es)${result.truncated ? ` (truncated from ${result.totalMatches})` : ""}:\n`);
    for (const match of result.matches) {
        const loc = `${match.file}:${match.range.start.line + 1}:${match.range.start.column + 1}`;
        lines.push(`${loc}`);
        lines.push(`  ${match.lines.trim()}`);
        lines.push("");
    }
    return lines.join("\n");
}
export function formatReplaceResult(result, isDryRun) {
    if (result.error) {
        return `Error: ${result.error}`;
    }
    if (result.matches.length === 0) {
        return "No matches found to replace";
    }
    const prefix = isDryRun ? "[DRY RUN] " : "";
    const lines = [];
    if (result.truncated) {
        const reason = result.truncatedReason === "max_matches"
            ? `showing first ${result.matches.length} of ${result.totalMatches}`
            : result.truncatedReason === "max_output_bytes"
                ? "output exceeded 1MB limit"
                : "search timed out";
        lines.push(`[TRUNCATED] Results truncated (${reason})\n`);
    }
    lines.push(`${prefix}${result.matches.length} replacement(s):\n`);
    for (const match of result.matches) {
        const loc = `${match.file}:${match.range.start.line + 1}:${match.range.start.column + 1}`;
        lines.push(`${loc}`);
        lines.push(`  ${match.text}`);
        lines.push("");
    }
    if (isDryRun) {
        lines.push("Use dryRun=false to apply changes");
    }
    return lines.join("\n");
}
export function formatAnalyzeResult(results, extractedMetaVars) {
    if (results.length === 0) {
        return "No matches found";
    }
    const lines = [`Found ${results.length} match(es):\n`];
    for (const result of results) {
        const loc = `L${result.range.start.line + 1}:${result.range.start.column + 1}`;
        lines.push(`[${loc}] (${result.kind})`);
        lines.push(`  ${result.text}`);
        if (extractedMetaVars && result.metaVariables.length > 0) {
            lines.push("  Meta-variables:");
            for (const mv of result.metaVariables) {
                lines.push(`    $${mv.name} = "${mv.text}" (${mv.kind})`);
            }
        }
        lines.push("");
    }
    return lines.join("\n");
}
export function formatTransformResult(_original, transformed, editCount) {
    if (editCount === 0) {
        return "No matches found to transform";
    }
    return `Transformed (${editCount} edit(s)):\n\`\`\`\n${transformed}\n\`\`\``;
}
