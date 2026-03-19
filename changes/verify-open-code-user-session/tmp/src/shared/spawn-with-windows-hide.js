import { spawn as bunSpawn } from "bun";
import { spawn as nodeSpawn } from "node:child_process";
import { Readable } from "node:stream";
function toReadableStream(stream) {
    if (!stream) {
        return undefined;
    }
    return Readable.toWeb(stream);
}
function wrapNodeProcess(proc) {
    let resolveExited;
    let exitCode = null;
    const exited = new Promise((resolve) => {
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
    return {
        get exitCode() {
            return exitCode;
        },
        exited,
        stdout: toReadableStream(proc.stdout),
        stderr: toReadableStream(proc.stderr),
        kill(signal) {
            try {
                if (!signal) {
                    proc.kill();
                    return;
                }
                proc.kill(signal);
            }
            catch { }
        },
    };
}
export function spawnWithWindowsHide(command, options) {
    if (process.platform !== "win32") {
        return bunSpawn(command, options);
    }
    const [cmd, ...args] = command;
    const proc = nodeSpawn(cmd, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: [options.stdin ?? "pipe", options.stdout ?? "pipe", options.stderr ?? "pipe"],
        windowsHide: true,
        shell: true,
    });
    return wrapNodeProcess(proc);
}
