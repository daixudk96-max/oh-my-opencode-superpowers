import { lstatSync, realpathSync } from "fs";
import { promises as fs } from "fs";
function normalizeDarwinRealpath(filePath) {
    return filePath.startsWith("/private/var/") ? filePath.slice("/private".length) : filePath;
}
export function isMarkdownFile(entry) {
    return !entry.name.startsWith(".") && entry.name.endsWith(".md") && entry.isFile();
}
export function isSymbolicLink(filePath) {
    try {
        return lstatSync(filePath, { throwIfNoEntry: false })?.isSymbolicLink() ?? false;
    }
    catch {
        return false;
    }
}
export function resolveSymlink(filePath) {
    try {
        return normalizeDarwinRealpath(realpathSync(filePath));
    }
    catch {
        return filePath;
    }
}
export async function resolveSymlinkAsync(filePath) {
    try {
        return normalizeDarwinRealpath(await fs.realpath(filePath));
    }
    catch {
        return filePath;
    }
}
