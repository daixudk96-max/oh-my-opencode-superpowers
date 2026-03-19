import { tool } from "@opencode-ai/plugin/tool";
import { formatLocation } from "./lsp-formatters";
import { withLspClient } from "./lsp-client-wrapper";
export const lsp_goto_definition = tool({
    description: "Jump to symbol definition. Find WHERE something is defined.",
    args: {
        filePath: tool.schema.string(),
        line: tool.schema.number().min(1).describe("1-based"),
        character: tool.schema.number().min(0).describe("0-based"),
    },
    execute: async (args, _context) => {
        try {
            const result = await withLspClient(args.filePath, async (client) => {
                return (await client.definition(args.filePath, args.line, args.character));
            });
            if (!result) {
                const output = "No definition found";
                return output;
            }
            const locations = Array.isArray(result) ? result : [result];
            if (locations.length === 0) {
                const output = "No definition found";
                return output;
            }
            const output = locations.map(formatLocation).join("\n");
            return output;
        }
        catch (e) {
            const output = `Error: ${e instanceof Error ? e.message : String(e)}`;
            return output;
        }
    },
});
