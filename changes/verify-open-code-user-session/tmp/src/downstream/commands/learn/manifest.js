import { loadBuiltinCommands } from "../../../features/builtin-commands";
export const manifest = {
    name: "learn",
    definition: loadBuiltinCommands().learn,
};
