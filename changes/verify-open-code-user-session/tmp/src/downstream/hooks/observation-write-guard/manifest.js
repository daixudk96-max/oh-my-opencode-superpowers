import { createObservationWriteGuardHook } from "../../../hooks/observation-write-guard";
export const manifest = {
    name: "observation-write-guard",
    lifecycle: ["tool.execute.before"],
    factory: createObservationWriteGuardHook,
};
