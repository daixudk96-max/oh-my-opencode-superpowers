export function sanitizeModelField(model, source = "claude-code") {
    if (source === "claude-code") {
        return undefined;
    }
    if (typeof model === "string" && model.trim().length > 0) {
        return model.trim();
    }
    return undefined;
}
