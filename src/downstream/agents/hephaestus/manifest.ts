import { createHephaestusAgent } from "../../../agents/hephaestus"
import type { AgentManifest } from "../../types"

export const manifest: AgentManifest = {
  name: "hephaestus",
  factory: createHephaestusAgent,
}
