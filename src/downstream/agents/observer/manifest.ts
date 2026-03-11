import { createObserverAgent, OBSERVER_PROMPT_METADATA } from "../../../agents/observer"
import type { AgentManifest } from "../../types"

export const manifest: AgentManifest = {
  name: "observer",
  factory: createObserverAgent,
  metadata: OBSERVER_PROMPT_METADATA,
}
