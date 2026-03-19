import { modify, applyEdits } from "jsonc-parser";
export function modifyProviderInJsonc(content, newProviderValue) {
    const edits = modify(content, ["provider"], newProviderValue, {
        formattingOptions: { tabSize: 2, insertSpaces: true },
    });
    return applyEdits(content, edits);
}
