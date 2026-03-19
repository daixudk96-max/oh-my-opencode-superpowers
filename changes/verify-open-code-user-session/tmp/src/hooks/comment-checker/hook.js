import z from "zod";
import { initializeCommentCheckerCli, getCommentCheckerCliPathPromise, isCliPathUsable, processWithCli, processApplyPatchEditsWithCli, } from "./cli-runner";
import { registerPendingCall, startPendingCallCleanup, takePendingCall } from "./pending-calls";
import * as fs from "fs";
import { tmpdir } from "os";
import { join } from "path";
const DEBUG = process.env.COMMENT_CHECKER_DEBUG === "1";
const DEBUG_FILE = join(tmpdir(), "comment-checker-debug.log");
function debugLog(...args) {
    if (DEBUG) {
        const msg = `[${new Date().toISOString()}] [comment-checker:hook] ${args
            .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
            .join(" ")}\n`;
        fs.appendFileSync(DEBUG_FILE, msg);
    }
}
export function createCommentCheckerHooks(config) {
    debugLog("createCommentCheckerHooks called", { config });
    startPendingCallCleanup();
    initializeCommentCheckerCli(debugLog);
    return {
        "tool.execute.before": async (input, output) => {
            debugLog("tool.execute.before:", {
                tool: input.tool,
                callID: input.callID,
                args: output.args,
            });
            const toolLower = input.tool.toLowerCase();
            if (toolLower !== "write" && toolLower !== "edit" && toolLower !== "multiedit") {
                debugLog("skipping non-write/edit tool:", toolLower);
                return;
            }
            const filePath = (output.args.filePath ??
                output.args.file_path ??
                output.args.path);
            const content = output.args.content;
            const oldString = (output.args.oldString ?? output.args.old_string);
            const newString = (output.args.newString ?? output.args.new_string);
            const edits = output.args.edits;
            debugLog("extracted filePath:", filePath);
            if (!filePath) {
                debugLog("no filePath found");
                return;
            }
            debugLog("registering pendingCall:", {
                callID: input.callID,
                filePath,
                tool: toolLower,
            });
            registerPendingCall(input.callID, {
                filePath,
                content,
                oldString: oldString,
                newString: newString,
                edits,
                tool: toolLower,
                sessionID: input.sessionID,
                timestamp: Date.now(),
            });
        },
        "tool.execute.after": async (input, output) => {
            debugLog("tool.execute.after:", { tool: input.tool, callID: input.callID });
            const toolLower = input.tool.toLowerCase();
            // Only skip if the output indicates a tool execution failure
            const outputLower = (output.output ?? "").toLowerCase();
            const isToolFailure = outputLower.includes("error:") ||
                outputLower.includes("failed to") ||
                outputLower.includes("could not") ||
                outputLower.startsWith("error");
            if (isToolFailure) {
                debugLog("skipping due to tool failure in output");
                return;
            }
            const ApplyPatchMetadataSchema = z.object({
                files: z.array(z.object({
                    filePath: z.string(),
                    movePath: z.string().optional(),
                    before: z.string(),
                    after: z.string(),
                    type: z.string().optional(),
                })),
            });
            if (toolLower === "apply_patch") {
                const parsed = ApplyPatchMetadataSchema.safeParse(output.metadata);
                if (!parsed.success) {
                    debugLog("apply_patch metadata schema mismatch, skipping");
                    return;
                }
                const edits = parsed.data.files
                    .filter((f) => f.type !== "delete")
                    .map((f) => ({
                    filePath: f.movePath ?? f.filePath,
                    before: f.before,
                    after: f.after,
                }));
                if (edits.length === 0) {
                    debugLog("apply_patch had no editable files, skipping");
                    return;
                }
                try {
                    const cliPath = await getCommentCheckerCliPathPromise();
                    if (!isCliPathUsable(cliPath)) {
                        debugLog("CLI not available, skipping comment check");
                        return;
                    }
                    debugLog("using CLI for apply_patch:", cliPath);
                    await processApplyPatchEditsWithCli(input.sessionID, edits, output, cliPath, config?.custom_prompt, debugLog);
                }
                catch (err) {
                    debugLog("apply_patch comment check failed:", err);
                }
                return;
            }
            const pendingCall = takePendingCall(input.callID);
            if (!pendingCall) {
                debugLog("no pendingCall found for:", input.callID);
                return;
            }
            debugLog("processing pendingCall:", pendingCall);
            try {
                const cliPath = await getCommentCheckerCliPathPromise();
                if (!isCliPathUsable(cliPath)) {
                    debugLog("CLI not available, skipping comment check");
                    return;
                }
                debugLog("using CLI:", cliPath);
                await processWithCli(input, pendingCall, output, cliPath, config?.custom_prompt, debugLog);
            }
            catch (err) {
                debugLog("tool.execute.after failed:", err);
            }
        },
    };
}
