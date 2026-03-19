import { createObservationRecorderHook } from "../../../hooks/observation-recorder";
export const manifest = {
    name: "observation-recorder",
    lifecycle: ["tool.execute.before", "tool.execute.after"],
    factory: createObservationRecorderHook,
};
