import { spawn } from "bun";
let tmuxPath = null;
let initPromise = null;
async function findTmuxPath() {
    const isWindows = process.platform === "win32";
    const cmd = isWindows ? "where" : "which";
    try {
        const proc = spawn([cmd, "tmux"], {
            stdout: "pipe",
            stderr: "pipe",
        });
        const exitCode = await proc.exited;
        if (exitCode !== 0) {
            return null;
        }
        const stdout = await new Response(proc.stdout).text();
        const path = stdout.trim().split("\n")[0];
        if (!path) {
            return null;
        }
        const verifyProc = spawn([path, "-V"], {
            stdout: "pipe",
            stderr: "pipe",
        });
        const verifyExitCode = await verifyProc.exited;
        if (verifyExitCode !== 0) {
            return null;
        }
        return path;
    }
    catch {
        return null;
    }
}
export async function getTmuxPath() {
    if (tmuxPath !== null) {
        return tmuxPath;
    }
    if (initPromise) {
        return initPromise;
    }
    initPromise = (async () => {
        const path = await findTmuxPath();
        tmuxPath = path;
        return path;
    })();
    return initPromise;
}
export function getCachedTmuxPath() {
    return tmuxPath;
}
export function startBackgroundCheck() {
    if (!initPromise) {
        initPromise = getTmuxPath();
        initPromise.catch(() => { });
    }
}
