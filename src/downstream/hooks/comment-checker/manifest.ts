import { createCommentCheckerHooks } from "../../../hooks/comment-checker"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "comment-checker",
  lifecycle: ["tool.execute.before", "tool.execute.after"],
  factory: createCommentCheckerHooks,
}
