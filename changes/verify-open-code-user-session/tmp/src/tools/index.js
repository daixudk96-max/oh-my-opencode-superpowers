import { lsp_goto_definition, lsp_find_references, lsp_symbols, lsp_diagnostics, lsp_prepare_rename, lsp_rename, lspManager, } from "./lsp";
export { lspManager };
export { createAstGrepTools } from "./ast-grep";
export { createGrepTools } from "./grep";
export { createGlobTools } from "./glob";
export { createSkillTool } from "./skill";
export { discoverCommandsSync } from "./slashcommand";
export { createSessionManagerTools } from "./session-manager";
export { sessionExists } from "./session-manager/storage";
export { interactive_bash, startBackgroundCheck as startTmuxCheck } from "./interactive-bash";
export { createSkillMcpTool } from "./skill-mcp";
import { createBackgroundOutput, createBackgroundCancel, } from "./background-task";
export { createCallOmoAgent } from "./call-omo-agent";
export { createLookAt } from "./look-at";
export { createDelegateTask } from "./delegate-task";
export { createTaskCreateTool, createTaskGetTool, createTaskList, createTaskUpdateTool, } from "./task";
export { createHashlineEditTool } from "./hashline-edit";
export function createBackgroundTools(manager, client) {
    const outputManager = manager;
    const cancelClient = client;
    return {
        background_output: createBackgroundOutput(outputManager, client),
        background_cancel: createBackgroundCancel(manager, cancelClient),
    };
}
export function createBuiltinTools(options = {}) {
    const tools = {
        lsp_goto_definition,
        lsp_find_references,
        lsp_symbols,
        lsp_diagnostics,
        lsp_prepare_rename,
        lsp_rename,
    };
    for (const manifest of options.additionalTools ?? []) {
        if (tools[manifest.name])
            continue;
        if (manifest.definition) {
            tools[manifest.name] = manifest.definition;
            continue;
        }
        tools[manifest.name] = manifest.factory();
    }
    return tools;
}
export const builtinTools = createBuiltinTools();
