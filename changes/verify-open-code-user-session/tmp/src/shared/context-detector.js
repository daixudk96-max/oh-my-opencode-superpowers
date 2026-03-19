/**
 * Context Detector
 *
 * Detects project context (package manager, framework, etc.) for conditional hook execution.
 */
/**
 * Lock file to package manager mapping
 */
const LOCK_FILE_MAP = {
    "bun.lockb": "bun",
    "package-lock.json": "npm",
    "yarn.lock": "yarn",
    "pnpm-lock.yaml": "pnpm",
};
/**
 * Config file to framework mapping
 */
const FRAMEWORK_CONFIG_MAP = {
    "next.config.js": "nextjs",
    "next.config.mjs": "nextjs",
    "next.config.ts": "nextjs",
    "vue.config.js": "vue",
    "angular.json": "angular",
    "svelte.config.js": "svelte",
};
/**
 * Dependency to framework mapping
 */
const FRAMEWORK_DEP_MAP = {
    next: "nextjs",
    react: "react",
    vue: "vue",
    "@angular/core": "angular",
    svelte: "svelte",
};
/**
 * Context Detector implementation
 */
class ContextDetectorImpl {
    mockFiles = null;
    mockDependencies = null;
    detect(projectPath) {
        const files = this.mockFiles || [];
        const deps = this.mockDependencies || {};
        return {
            packageManager: this.detectPackageManager(files),
            framework: this.detectFramework(files, deps),
            hasTypeScript: this.detectTypeScript(files),
            hasTesting: this.detectTesting(files, deps),
        };
    }
    detectPackageManager(files) {
        for (const [lockFile, pm] of Object.entries(LOCK_FILE_MAP)) {
            if (files.includes(lockFile)) {
                return pm;
            }
        }
        return "unknown";
    }
    detectFramework(files, deps) {
        // Check config files first (more specific)
        for (const [configFile, fw] of Object.entries(FRAMEWORK_CONFIG_MAP)) {
            if (files.includes(configFile)) {
                return fw;
            }
        }
        // Check dependencies
        for (const [dep, fw] of Object.entries(FRAMEWORK_DEP_MAP)) {
            if (dep in deps) {
                return fw;
            }
        }
        return "unknown";
    }
    detectTypeScript(files) {
        return files.includes("tsconfig.json");
    }
    detectTesting(files, deps) {
        const testConfigs = ["jest.config.js", "vitest.config.ts", "vitest.config.js"];
        if (testConfigs.some((f) => files.includes(f))) {
            return true;
        }
        const testDeps = ["jest", "vitest", "mocha", "@testing-library/react"];
        return testDeps.some((d) => d in deps);
    }
    matchesCondition(context, condition) {
        // Empty condition always matches
        if (Object.keys(condition).length === 0) {
            return true;
        }
        // All specified conditions must match (AND logic)
        if (condition.packageManager !== undefined) {
            if (context.packageManager !== condition.packageManager) {
                return false;
            }
        }
        if (condition.framework !== undefined) {
            if (context.framework !== condition.framework) {
                return false;
            }
        }
        if (condition.hasTypeScript !== undefined) {
            if (context.hasTypeScript !== condition.hasTypeScript) {
                return false;
            }
        }
        if (condition.hasTesting !== undefined) {
            if (context.hasTesting !== condition.hasTesting) {
                return false;
            }
        }
        return true;
    }
    setMockFiles(files) {
        this.mockFiles = files;
    }
    setMockDependencies(deps) {
        this.mockDependencies = deps;
    }
}
/**
 * Create a new Context Detector instance
 */
export function createContextDetector() {
    return new ContextDetectorImpl();
}
