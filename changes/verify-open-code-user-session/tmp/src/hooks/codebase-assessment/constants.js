/**
 * Codebase Assessment Hook Constants
 *
 * Collects project configuration info for PHASE 1 assessment.
 * Implements Task 8.1 from SUBAGENTS-COMPARISON.md
 */
export const HOOK_NAME = "codebase-assessment";
export const CONFIG_FILES = [
    // Linters
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.json",
    "eslint.config.js",
    "eslint.config.mjs",
    "biome.json",
    // Formatters
    ".prettierrc",
    ".prettierrc.js",
    ".prettierrc.json",
    "prettier.config.js",
    // TypeScript
    "tsconfig.json",
    "jsconfig.json",
    // Package managers
    "package.json",
    "bun.lockb",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    // Testing
    "jest.config.js",
    "jest.config.ts",
    "vitest.config.ts",
    "vitest.config.js",
    // Build tools
    "vite.config.ts",
    "vite.config.js",
    "webpack.config.js",
    "rollup.config.js",
    "esbuild.config.js",
    // Git
    ".gitignore",
    ".git",
];
export const CODEBASE_STATES = {
    DISCIPLINED: "disciplined",
    TRANSITIONAL: "transitional",
    LEGACY: "legacy",
    GREENFIELD: "greenfield",
};
