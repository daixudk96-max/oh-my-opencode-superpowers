import { tool } from "@opencode-ai/plugin/tool";
import { formatApplyResult, formatPrepareRenameResult } from "./lsp-formatters";
import { withLspClient } from "./lsp-client-wrapper";
import { applyWorkspaceEdit } from "./workspace-edit";
export const lsp_prepare_rename = tool({
    description: "Check if rename is valid. Use BEFORE lsp_rename.",
    args: {
        filePath: tool.schema.string(),
        line: tool.schema.number().min(1).describe("1-based"),
        character: tool.schema.number().min(0).describe("0-based"),
    },
    execute: async (args, _context) => {
        try {
            const result = await withLspClient(args.filePath, async (client) => {
                return (await client.prepareRename(args.filePath, args.line, args.character));
            });
            const output = formatPrepareRenameResult(result);
            return output;
        }
        catch (e) {
            const output = `Error: ${e instanceof Error ? e.message : String(e)}`;
            return output;
        }
    },
});
export const lsp_rename = tool({
    description: "Rename symbol across entire workspace. APPLIES changes to all files.",
    args: {
        filePath: tool.schema.string(),
        line: tool.schema.number().min(1).describe("1-based"),
        character: tool.schema.number().min(0).describe("0-based"),
        newName: tool.schema.string().describe("New symbol name"),
    },
    execute: async (args, _context) => {
        try {
            const edit = await withLspClient(args.filePath, async (client) => {
                return (await client.rename(args.filePath, args.line, args.character, args.newName));
            });
            const result = applyWorkspaceEdit(edit);
            const output = formatApplyResult(result);
            return output;
        }
        catch (e) {
            const output = `Error: ${e instanceof Error ? e.message : String(e)}`;
            return output;
        }
    },
});
