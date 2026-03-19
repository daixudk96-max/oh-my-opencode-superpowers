/**
 * Parse a model string in "provider/model" format.
 */
export function parseModelString(model) {
    const parts = model.split("/");
    if (parts.length >= 2) {
        return { providerID: parts[0], modelID: parts.slice(1).join("/") };
    }
    return undefined;
}
