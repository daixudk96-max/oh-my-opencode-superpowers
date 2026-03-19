import { createDebugInjectorHook } from "../../../hooks/debugging-injector";
export const manifest = {
    name: "debugging-injector",
    lifecycle: ["tool.execute.before", "tool.execute.after"],
    factory: createDebugInjectorHook,
};
