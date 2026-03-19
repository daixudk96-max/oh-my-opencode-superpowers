import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
export class ProjectDetector {
    static _cache = new Map();
    projectRoot;
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
    }
    async detect() {
        if (ProjectDetector._cache.has(this.projectRoot)) {
            return ProjectDetector._cache.get(this.projectRoot);
        }
        const info = {
            packageManager: this.detectPackageManager(),
            frameworks: this.detectFrameworks(),
            codeStyle: this.detectCodeStyle(),
        };
        ProjectDetector._cache.set(this.projectRoot, info);
        return info;
    }
    detectPackageManager() {
        if (existsSync(join(this.projectRoot, "bun.lockb")))
            return "bun";
        if (existsSync(join(this.projectRoot, "pnpm-lock.yaml")))
            return "pnpm";
        if (existsSync(join(this.projectRoot, "yarn.lock")))
            return "yarn";
        if (existsSync(join(this.projectRoot, "package-lock.json")))
            return "npm";
        return "unknown";
    }
    detectFrameworks() {
        const frameworks = [];
        const packageJsonPath = join(this.projectRoot, "package.json");
        if (!existsSync(packageJsonPath))
            return frameworks;
        try {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
            const allDeps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies,
            };
            if (allDeps["react"])
                frameworks.push("react");
            if (allDeps["vue"])
                frameworks.push("vue");
            if (allDeps["next"])
                frameworks.push("next.js");
            if (allDeps["express"])
                frameworks.push("express");
        }
        catch {
            // Ignore parse errors
        }
        return frameworks;
    }
    detectCodeStyle() {
        return {
            eslint: this.hasFile([".eslintrc", ".eslintrc.json", ".eslintrc.js", "eslint.config.js"]),
            prettier: this.hasFile([".prettierrc", "prettier.config.js"]),
        };
    }
    hasFile(filenames) {
        return filenames.some(name => existsSync(join(this.projectRoot, name)));
    }
}
