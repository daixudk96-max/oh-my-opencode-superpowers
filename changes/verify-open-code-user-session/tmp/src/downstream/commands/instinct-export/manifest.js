import { loadBuiltinCommands } from "../../../features/builtin-commands";
export const manifest = {
    name: "instinct-export",
    definition: loadBuiltinCommands()["instinct-export"],
};
