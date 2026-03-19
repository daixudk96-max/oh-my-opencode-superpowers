import { exec } from "node:child_process";
import { promisify } from "node:util";
const execAsync = promisify(exec);
export async function executeCommand(command) {
    try {
        const { stdout, stderr } = await execAsync(command);
        const out = stdout?.toString().trim() ?? "";
        const err = stderr?.toString().trim() ?? "";
        if (err) {
            return out ? `${out}\n[stderr: ${err}]` : `[stderr: ${err}]`;
        }
        return out;
    }
    catch (error) {
        const e = error;
        const stdout = e?.stdout?.toString().trim() ?? "";
        const stderr = e?.stderr?.toString().trim() ?? "";
        const errorMessage = stderr || e?.message || String(error);
        return stdout ? `${stdout}\n[stderr: ${errorMessage}]` : `[stderr: ${errorMessage}]`;
    }
}
