import { existsSync, readFileSync, statSync } from "fs";
import { join, isAbsolute } from "path";
const FILE_REFERENCE_PATTERN = /@([^\s@]+)/g;
function findFileReferences(text) {
    const matches = [];
    let match;
    FILE_REFERENCE_PATTERN.lastIndex = 0;
    while ((match = FILE_REFERENCE_PATTERN.exec(text)) !== null) {
        matches.push({
            fullMatch: match[0],
            filePath: match[1],
            start: match.index,
            end: match.index + match[0].length,
        });
    }
    return matches;
}
function resolveFilePath(filePath, cwd) {
    if (isAbsolute(filePath)) {
        return filePath;
    }
    return join(cwd, filePath);
}
function readFileContent(resolvedPath) {
    if (!existsSync(resolvedPath)) {
        return `[file not found: ${resolvedPath}]`;
    }
    const stat = statSync(resolvedPath);
    if (stat.isDirectory()) {
        return `[cannot read directory: ${resolvedPath}]`;
    }
    const content = readFileSync(resolvedPath, "utf-8");
    return content;
}
export async function resolveFileReferencesInText(text, cwd = process.cwd(), depth = 0, maxDepth = 3) {
    if (depth >= maxDepth) {
        return text;
    }
    const matches = findFileReferences(text);
    if (matches.length === 0) {
        return text;
    }
    const replacements = new Map();
    for (const match of matches) {
        const resolvedPath = resolveFilePath(match.filePath, cwd);
        const content = readFileContent(resolvedPath);
        replacements.set(match.fullMatch, content);
    }
    let resolved = text;
    for (const [pattern, replacement] of replacements.entries()) {
        resolved = resolved.split(pattern).join(replacement);
    }
    if (findFileReferences(resolved).length > 0 && depth + 1 < maxDepth) {
        return resolveFileReferencesInText(resolved, cwd, depth + 1, maxDepth);
    }
    return resolved;
}
