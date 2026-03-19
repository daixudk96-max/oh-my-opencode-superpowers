import { createSisyphusJuniorNotepadHook } from "../../../hooks/sisyphus-junior-notepad";
export const manifest = {
    name: "sisyphus-junior-notepad",
    lifecycle: ["tool.execute.before"],
    factory: createSisyphusJuniorNotepadHook,
};
