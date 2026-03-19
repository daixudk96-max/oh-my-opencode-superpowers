import { existsSync } from "fs";
import { runCommentChecker, getCommentCheckerPath, startBackgroundInit } from "./cli";
let cliPathPromise = null;
let isRunning = false;
async function withCommentCheckerLock(fn, fallback, debugLog) {
    if (isRunning) {
        debugLog("comment-checker already running, skipping");
        return fallback;
    }
    isRunning = true;
    try {
        return await fn();
    }
    finally {
        isRunning = false;
    }
}
export function initializeCommentCheckerCli(debugLog) {
    // Start background CLI initialization (may trigger lazy download)
    startBackgroundInit();
    cliPathPromise = getCommentCheckerPath();
    cliPathPromise
        .then((path) => {
        debugLog("CLI path resolved:", path || "disabled (no binary)");
    })
        .catch((err) => {
        debugLog("CLI path resolution error:", err);
    });
}
export function getCommentCheckerCliPathPromise() {
    return cliPathPromise;
}
export async function processWithCli(input, pendingCall, output, cliPath, customPrompt, debugLog) {
    await withCommentCheckerLock(async () => {
        void input;
        debugLog("using CLI mode with path:", cliPath);
        const hookInput = {
            session_id: pendingCall.sessionID,
            tool_name: pendingCall.tool.charAt(0).toUpperCase() + pendingCall.tool.slice(1),
            transcript_path: "",
            cwd: process.cwd(),
            hook_event_name: "PostToolUse",
            tool_input: {
                file_path: pendingCall.filePath,
                content: pendingCall.content,
                old_string: pendingCall.oldString,
                new_string: pendingCall.newString,
                edits: pendingCall.edits,
            },
        };
        const result = await runCommentChecker(hookInput, cliPath, customPrompt);
        if (result.hasComments && result.message) {
            debugLog("CLI detected comments, appending message");
            output.output += `\n\n${result.message}`;
        }
        else {
            debugLog("CLI: no comments detected");
        }
    }, undefined, debugLog);
}
export async function processApplyPatchEditsWithCli(sessionID, edits, output, cliPath, customPrompt, debugLog) {
    debugLog("processing apply_patch edits:", edits.length);
    for (const edit of edits) {
        await withCommentCheckerLock(async () => {
            const hookInput = {
                session_id: sessionID,
                tool_name: "Edit",
                transcript_path: "",
                cwd: process.cwd(),
                hook_event_name: "PostToolUse",
                tool_input: {
                    file_path: edit.filePath,
                    old_string: edit.before,
                    new_string: edit.after,
                },
            };
            const result = await runCommentChecker(hookInput, cliPath, customPrompt);
            if (result.hasComments && result.message) {
                debugLog("CLI detected comments for apply_patch file:", edit.filePath);
                output.output += `\n\n${result.message}`;
            }
        }, undefined, debugLog);
    }
}
export function isCliPathUsable(cliPath) {
    return Boolean(cliPath && existsSync(cliPath));
}
