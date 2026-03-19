const KEYWORD_PATTERN = /\b(ultrawork|ulw)\b/gi;
const WORKTREE_FLAG_PATTERN = /--worktree(?:\s+(\S+))?/;
const MODE_FLAG_PATTERN = /--mode(?:=|\s+)(\S+)/i;
function normalizeExecutionMode(rawMode) {
    if (!rawMode)
        return null;
    const normalized = rawMode.toLowerCase();
    if (normalized === "sequential" || normalized === "seq") {
        return "sequential";
    }
    if (normalized === "parallel" || normalized === "wave" || normalized === "wave-parallel") {
        return "parallel";
    }
    return null;
}
export function parseUserRequest(promptText) {
    const match = promptText.match(/<user-request>\s*([\s\S]*?)\s*<\/user-request>/i);
    if (!match)
        return { planName: null, explicitWorktreePath: null, explicitExecutionMode: null };
    let rawArg = match[1].trim();
    if (!rawArg)
        return { planName: null, explicitWorktreePath: null, explicitExecutionMode: null };
    const worktreeMatch = rawArg.match(WORKTREE_FLAG_PATTERN);
    const explicitWorktreePath = worktreeMatch ? (worktreeMatch[1] ?? null) : null;
    if (worktreeMatch) {
        rawArg = rawArg.replace(worktreeMatch[0], "").trim();
    }
    const modeMatch = rawArg.match(MODE_FLAG_PATTERN);
    const explicitExecutionMode = normalizeExecutionMode(modeMatch?.[1]);
    if (modeMatch) {
        rawArg = rawArg.replace(modeMatch[0], "").trim();
    }
    const cleanedArg = rawArg.replace(KEYWORD_PATTERN, "").trim();
    return {
        planName: cleanedArg || null,
        explicitWorktreePath,
        explicitExecutionMode,
    };
}
