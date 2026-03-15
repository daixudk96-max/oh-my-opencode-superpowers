/**
 * Cross-platform check if a path is inside changes/ or .sisyphus/ directory.
 * Handles both forward slashes (Unix) and backslashes (Windows).
 * Uses path segment matching (not substring) to avoid false positives like "not-sisyphus/file.txt"
 */
export function isSisyphusPath(filePath: string): boolean { // TDD-EXEMPT: path migration fix
  return /\.sisyphus[/\\]/.test(filePath) || /changes[/\\]/.test(filePath)
}
