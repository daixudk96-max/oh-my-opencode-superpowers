import { createAutoSlashCommandHook } from "../../../hooks/auto-slash-command"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "auto-slash-command",
  lifecycle: ["chat.message", "command.execute.before"],
  factory: createAutoSlashCommandHook,
}
