import { createPlanAttentionRefresherHook } from "../../../hooks/plan-attention-refresher"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "plan-attention-refresher",
  lifecycle: ["tool.execute.before"],
  factory: createPlanAttentionRefresherHook,
}
