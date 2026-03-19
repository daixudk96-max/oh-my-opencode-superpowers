import { spawn as bunSpawn } from "bun";
import { spawn as nodeSpawn } from "node:child_process";
import { existsSync, statSync } from "fs";
import { log } from "../../shared/logger";
// Bun spawn segfaults on Windows (oven-sh/bun#25798) — unfixed as of v1.3.8+
function shouldUseNodeSpawn() {
    return process.platform === "win32";
}
// Prevents segfaults when libuv gets a non-existent cwd (oven-sh/bun#25798)
export function validateCwd(cwd) {
    try {
        if (!existsSync(cwd)) {
            return { valid: false, error: `Working directory does not exist: ${cwd}` };
        }
        const stats = statSync(cwd);
        if (!stats.isDirectory()) {
            return { valid: false, error: `Path is not a directory: ${cwd}` };
        }
        return { valid: true };
    }
    catch (err) {
        return { valid: false, error: `Cannot access working directory: ${cwd} (${err instanceof Error ? err.message : String(err)})` };
    }
}
function wrapNodeProcess(proc) {
    let resolveExited;
    let exitCode = null;
    const exitedPromise = new Promise((resolve) => {
        resolveExited = resolve;
    });
    proc.on("exit", (code) => {
        exitCode = code ?? 1;
        resolveExited(exitCode);
    });
    proc.on("error", () => {
        if (exitCode === null) {
            exitCode = 1;
            resolveExited(1);
        }
    });
    const createStreamReader = (nodeStream) => {
        const chunks = [];
        let streamEnded = false;
        let waitingResolve = null;
        if (nodeStream) {
            nodeStream.on("data", (chunk) => {
                const uint8 = new Uint8Array(chunk);
                if (waitingResolve) {
                    const resolve = waitingResolve;
                    waitingResolve = null;
                    resolve({ done: false, value: uint8 });
                }
                else {
                    chunks.push(uint8);
                }
            });
            nodeStream.on("end", () => {
                streamEnded = true;
                if (waitingResolve) {
                    const resolve = waitingResolve;
                    waitingResolve = null;
                    resolve({ done: true, value: undefined });
                }
            });
            nodeStream.on("error", () => {
                streamEnded = true;
                if (waitingResolve) {
                    const resolve = waitingResolve;
                    waitingResolve = null;
                    resolve({ done: true, value: undefined });
                }
            });
        }
        else {
            streamEnded = true;
        }
        return {
            read() {
                return new Promise((resolve) => {
                    if (chunks.length > 0) {
                        resolve({ done: false, value: chunks.shift() });
                    }
                    else if (streamEnded) {
                        resolve({ done: true, value: undefined });
                    }
                    else {
                        waitingResolve = resolve;
                    }
                });
            },
        };
    };
    return {
        stdin: {
            write(chunk) {
                if (proc.stdin) {
                    proc.stdin.write(chunk);
                }
            },
        },
        stdout: {
            getReader: () => createStreamReader(proc.stdout),
        },
        stderr: {
            getReader: () => createStreamReader(proc.stderr),
        },
        get exitCode() {
            return exitCode;
        },
        exited: exitedPromise,
        kill(signal) {
            try {
                if (signal === "SIGKILL") {
                    proc.kill("SIGKILL");
                }
                else {
                    proc.kill();
                }
            }
            catch { }
        },
    };
}
export function spawnProcess(command, options) {
    const cwdValidation = validateCwd(options.cwd);
    if (!cwdValidation.valid) {
        throw new Error(`[LSP] ${cwdValidation.error}`);
    }
    if (shouldUseNodeSpawn()) {
        const [cmd, ...args] = command;
        log("[LSP] Using Node.js child_process on Windows to avoid Bun spawn segfault");
        const proc = nodeSpawn(cmd, args, {
            cwd: options.cwd,
            env: options.env,
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
            shell: true,
        });
        return wrapNodeProcess(proc);
    }
    const proc = bunSpawn(command, {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        cwd: options.cwd,
        env: options.env,
    });
    return proc;
}
