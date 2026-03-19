import { loadBuiltinCommands } from "../../../features/builtin-commands";
export const manifest = {
    name: "instinct-import",
    definition: loadBuiltinCommands()["instinct-import"],
};
