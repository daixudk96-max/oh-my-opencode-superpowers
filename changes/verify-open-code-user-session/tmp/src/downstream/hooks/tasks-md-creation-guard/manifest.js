import { createTasksMdCreationGuardHook } from "../../../hooks/tasks-md-creation-guard";
export const manifest = {
    name: "tasks-md-creation-guard",
    lifecycle: ["tool.execute.before", "tool.execute.after"],
    factory: createTasksMdCreationGuardHook,
};
