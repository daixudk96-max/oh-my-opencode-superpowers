function extractModelName(model) {
    return model.includes("/") ? model.split("/").pop() ?? model : model;
}
export function isGptModel(model) {
    const modelName = extractModelName(model).toLowerCase();
    return modelName.includes("gpt");
}
const GEMINI_PROVIDERS = ["google/", "google-vertex/"];
export function isGeminiModel(model) {
    if (GEMINI_PROVIDERS.some((prefix) => model.startsWith(prefix)))
        return true;
    if (model.startsWith("github-copilot/") && extractModelName(model).toLowerCase().startsWith("gemini"))
        return true;
    const modelName = extractModelName(model).toLowerCase();
    return modelName.startsWith("gemini-");
}
