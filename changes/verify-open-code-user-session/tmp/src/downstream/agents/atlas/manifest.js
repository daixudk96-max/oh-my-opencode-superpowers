import { atlasPromptMetadata, createAtlasAgent } from "../../../agents/atlas";
export const manifest = {
    name: "atlas",
    factory: createAtlasAgent,
    metadata: atlasPromptMetadata,
};
