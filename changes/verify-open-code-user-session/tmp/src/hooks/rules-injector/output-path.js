export function getRuleInjectionFilePath(output) {
    const metadata = output.metadata;
    const metadataFilePath = metadata && typeof metadata === "object" ? metadata.filePath : undefined;
    if (typeof metadataFilePath === "string" && metadataFilePath.length > 0) {
        return metadataFilePath;
    }
    if (typeof output.title === "string" && output.title.length > 0) {
        return output.title;
    }
    return null;
}
