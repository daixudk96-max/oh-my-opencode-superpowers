import { spawnWithWindowsHide } from "../../shared/spawn-with-windows-hide";
import { initConfigContext } from "./config-context";
const OPENCODE_BINARIES = ["opencode", "opencode-desktop"];
async function findOpenCodeBinaryWithVersion() {
    for (const binary of OPENCODE_BINARIES) {
        try {
            const proc = spawnWithWindowsHide([binary, "--version"], {
                stdout: "pipe",
                stderr: "pipe",
            });
            const output = await new Response(proc.stdout).text();
            await proc.exited;
            if (proc.exitCode === 0) {
                const version = output.trim();
                initConfigContext(binary, version);
                return { binary, version };
            }
        }
        catch {
            continue;
        }
    }
    return null;
}
export async function isOpenCodeInstalled() {
    const result = await findOpenCodeBinaryWithVersion();
    return result !== null;
}
export async function getOpenCodeVersion() {
    const result = await findOpenCodeBinaryWithVersion();
    return result?.version ?? null;
}
