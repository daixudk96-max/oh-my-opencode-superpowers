import { createCommitSizeChecker } from "../../hooks/pre-tool-use/commit-size-checker";
/**
 * Pattern C wrapper: preserve upstream checker behavior and add warning emission.
 */
export function createCommitSizeCheckerWrapper() {
    const checker = createCommitSizeChecker();
    const originalHook = checker["tool.execute.before"]?.bind(checker);
    checker["tool.execute.before"] = (input, output) => {
        originalHook?.(input, output);
        // originalHook now handles staged file detection and blocking.
        // Only run wrapper fallback if originalHook didn't already block.
        if (output.blocked)
            return;
        if (input.tool !== "bash")
            return;
        const command = output.args?.command;
        if (!command || !checker.isCommitCommand(command))
            return;
        const files = checker.getStagedFiles(output.args?.cwd ?? process.cwd());
        const result = checker.check({ files });
        if (!result.shouldWarn)
            return;
        output.blocked = true;
        if (!result.message)
            return;
        const prefix = output.message && output.message.length > 0 ? "\n\n" : "";
        output.message = `${output.message ?? ""}${prefix}${result.message}`;
    };
    return checker;
}
