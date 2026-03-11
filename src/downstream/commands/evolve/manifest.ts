import { loadBuiltinCommands } from "../../../features/builtin-commands"
import type { CommandManifest } from "../../types"

export const manifest: CommandManifest = {
  name: "evolve",
  definition: loadBuiltinCommands().evolve,
}
