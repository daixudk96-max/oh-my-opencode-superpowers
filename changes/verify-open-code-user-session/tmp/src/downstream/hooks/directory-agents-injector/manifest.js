import { createDirectoryAgentsInjectorHook } from "../../../hooks/directory-agents-injector";
export const manifest = {
    name: "directory-agents-injector",
    lifecycle: ["tool.execute.before", "tool.execute.after", "event"],
    factory: createDirectoryAgentsInjectorHook,
};
