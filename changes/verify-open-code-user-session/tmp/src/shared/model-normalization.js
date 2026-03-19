export function normalizeModel(model) {
    const trimmed = model?.trim();
    return trimmed || undefined;
}
export function normalizeModelID(modelID) {
    return modelID.replace(/\.(\d+)/g, "-$1");
}
