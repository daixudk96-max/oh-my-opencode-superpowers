import { createAutoSlashCommandHook } from "../../../hooks/auto-slash-command";
export const manifest = {
    name: "auto-slash-command",
    lifecycle: ["chat.message", "command.execute.before"],
    factory: createAutoSlashCommandHook,
};
