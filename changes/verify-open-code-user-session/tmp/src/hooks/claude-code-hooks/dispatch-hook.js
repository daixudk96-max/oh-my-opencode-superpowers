import { executeHookCommand } from "../../shared";
import { executeHttpHook } from "./execute-http-hook";
import { DEFAULT_CONFIG } from "./plugin-config";
export function getHookIdentifier(hook) {
    if (hook.type === "http")
        return hook.url;
    return hook.command.split("/").pop() || hook.command;
}
export async function dispatchHook(hook, stdinJson, cwd) {
    if (hook.type === "http") {
        return executeHttpHook(hook, stdinJson);
    }
    return executeHookCommand(hook.command, stdinJson, cwd, { forceZsh: DEFAULT_CONFIG.forceZsh, zshPath: DEFAULT_CONFIG.zshPath });
}
