import { createSessionScorer } from "../../../features/session-scorer"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "session-scorer",
  lifecycle: ["event"],
  factory: () => {
    const scorer = createSessionScorer()

    return {
      event: scorer.event?.bind(scorer),
    }
  },
}
