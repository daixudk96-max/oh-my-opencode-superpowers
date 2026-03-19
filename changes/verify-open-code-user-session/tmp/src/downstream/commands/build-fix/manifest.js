import { loadBuiltinCommands } from "../../../features/builtin-commands";
export const manifest = {
    name: "build-fix",
    definition: loadBuiltinCommands()["build-fix"],
};
