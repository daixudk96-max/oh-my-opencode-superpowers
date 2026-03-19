import { createNotepadWriteGuardHook } from "../../../hooks/notepad-write-guard";
export const manifest = {
    name: "notepad-write-guard",
    lifecycle: ["tool.execute.before"],
    factory: createNotepadWriteGuardHook,
};
