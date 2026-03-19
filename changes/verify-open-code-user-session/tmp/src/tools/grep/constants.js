import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { getInstalledRipgrepPath, downloadAndInstallRipgrep } from "./downloader";
import { getDataDir } from "../../shared/data-path";
let cachedCli = null;
let autoInstallAttempted = false;
function findExecutable(name) {
    const isWindows = process.platform === "win32";
    const cmd = isWindows ? "where" : "which";
    try {
        const result = spawnSync(cmd, [name], { encoding: "utf-8", timeout: 5000 });
        if (result.status === 0 && result.stdout.trim()) {
            return result.stdout.trim().split("\n")[0];
        }
    }
    catch {
        // Command execution failed
    }
    return null;
}
function getOpenCodeBundledRg() {
    const execPath = process.execPath;
    const execDir = dirname(execPath);
    const isWindows = process.platform === "win32";
    const rgName = isWindows ? "rg.exe" : "rg";
    const candidates = [
        // OpenCode XDG data path (highest priority - where OpenCode installs rg)
        join(getDataDir(), "opencode", "bin", rgName),
        // Legacy paths relative to execPath
        join(execDir, rgName),
        join(execDir, "bin", rgName),
        join(execDir, "..", "bin", rgName),
        join(execDir, "..", "libexec", rgName),
    ];
    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}
export function resolveGrepCli() {
    if (cachedCli)
        return cachedCli;
    const bundledRg = getOpenCodeBundledRg();
    if (bundledRg) {
        cachedCli = { path: bundledRg, backend: "rg" };
        return cachedCli;
    }
    const systemRg = findExecutable("rg");
    if (systemRg) {
        cachedCli = { path: systemRg, backend: "rg" };
        return cachedCli;
    }
    const installedRg = getInstalledRipgrepPath();
    if (installedRg) {
        cachedCli = { path: installedRg, backend: "rg" };
        return cachedCli;
    }
    const grep = findExecutable("grep");
    if (grep) {
        cachedCli = { path: grep, backend: "grep" };
        return cachedCli;
    }
    cachedCli = { path: "rg", backend: "rg" };
    return cachedCli;
}
export async function resolveGrepCliWithAutoInstall() {
    const current = resolveGrepCli();
    if (current.backend === "rg") {
        return current;
    }
    if (autoInstallAttempted) {
        return current;
    }
    autoInstallAttempted = true;
    try {
        const rgPath = await downloadAndInstallRipgrep();
        cachedCli = { path: rgPath, backend: "rg" };
        return cachedCli;
    }
    catch {
        return current;
    }
}
export const DEFAULT_MAX_DEPTH = 20;
export const DEFAULT_MAX_FILESIZE = "10M";
export const DEFAULT_MAX_COUNT = 500;
export const DEFAULT_MAX_COLUMNS = 1000;
export const DEFAULT_CONTEXT = 2;
export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_MAX_OUTPUT_BYTES = 256 * 1024;
export const DEFAULT_RG_THREADS = 4;
export const RG_SAFETY_FLAGS = [
    "--no-follow",
    "--color=never",
    "--no-heading",
    "--line-number",
    "--with-filename",
];
export const GREP_SAFETY_FLAGS = ["-n", "-H", "--color=never"];
