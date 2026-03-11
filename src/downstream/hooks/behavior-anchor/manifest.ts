import { createBehaviorAnchorHook } from "../../../hooks/behavior-anchor"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "behavior-anchor",
  lifecycle: ["tool.execute.after"],
  factory: createBehaviorAnchorHook,
}
