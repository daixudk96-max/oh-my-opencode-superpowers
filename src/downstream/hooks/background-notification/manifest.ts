import { createBackgroundNotificationHook } from "../../../hooks/background-notification"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "background-notification",
  lifecycle: ["chat.message", "event"],
  factory: createBackgroundNotificationHook,
}
