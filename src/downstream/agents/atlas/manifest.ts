import { atlasPromptMetadata, createAtlasAgent } from "../../../agents/atlas"
import type { AgentManifest } from "../../types"

export const manifest: AgentManifest = {
  name: "atlas",
  factory: createAtlasAgent,
  metadata: atlasPromptMetadata,
}
