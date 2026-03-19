const WRITE_EDIT_TOOLS = ["Write", "Edit", "write", "edit"];
export function isWriteOrEditToolName(toolName) {
    return WRITE_EDIT_TOOLS.includes(toolName);
}
