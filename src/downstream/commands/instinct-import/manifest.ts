import { loadBuiltinCommands } from "../../../features/builtin-commands"
import type { CommandManifest } from "../../types"

export const manifest: CommandManifest = {
  name: "instinct-import",
  definition: loadBuiltinCommands()["instinct-import"],
}
