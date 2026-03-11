import { loadBuiltinCommands } from "../../../features/builtin-commands"
import type { CommandManifest } from "../../types"

export const manifest: CommandManifest = {
  name: "build-fix",
  definition: loadBuiltinCommands()["build-fix"],
}
