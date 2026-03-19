import { createPreemptiveCompactionHook } from "../../../hooks/preemptive-compaction";
export const manifest = {
    name: "background-compaction",
    lifecycle: ["tool.execute.after", "event"],
    factory: createPreemptiveCompactionHook,
};
