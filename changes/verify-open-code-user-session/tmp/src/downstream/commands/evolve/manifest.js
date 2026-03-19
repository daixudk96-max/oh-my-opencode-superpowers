import { loadBuiltinCommands } from "../../../features/builtin-commands";
export const manifest = {
    name: "evolve",
    definition: loadBuiltinCommands().evolve,
};
