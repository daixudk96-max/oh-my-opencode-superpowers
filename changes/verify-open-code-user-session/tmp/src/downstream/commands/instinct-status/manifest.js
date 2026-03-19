import { loadBuiltinCommands } from "../../../features/builtin-commands";
export const manifest = {
    name: "instinct-status",
    definition: loadBuiltinCommands()["instinct-status"],
};
