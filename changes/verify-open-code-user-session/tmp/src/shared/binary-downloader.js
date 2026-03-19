import { chmodSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import * as path from "node:path";
import { spawn } from "bun";
import { extractZip } from "./zip-extractor";
export function getCachedBinaryPath(cacheDir, binaryName) {
    const binaryPath = path.join(cacheDir, binaryName);
    return existsSync(binaryPath) ? binaryPath : null;
}
export function ensureCacheDir(cacheDir) {
    if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
    }
}
export async function downloadArchive(downloadUrl, archivePath) {
    const response = await fetch(downloadUrl, { redirect: "follow" });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    await Bun.write(archivePath, arrayBuffer);
}
export async function extractTarGz(archivePath, destDir, options) {
    const args = options?.args ?? ["tar", "-xzf", archivePath, "-C", destDir];
    const proc = spawn(args, {
        cwd: options?.cwd,
        stdout: "pipe",
        stderr: "pipe",
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text();
        throw new Error(`tar extraction failed (exit ${exitCode}): ${stderr}`);
    }
}
export async function extractZipArchive(archivePath, destDir) {
    await extractZip(archivePath, destDir);
}
export function cleanupArchive(archivePath) {
    if (existsSync(archivePath)) {
        unlinkSync(archivePath);
    }
}
export function ensureExecutable(binaryPath) {
    if (process.platform !== "win32" && existsSync(binaryPath)) {
        chmodSync(binaryPath, 0o755);
    }
}
