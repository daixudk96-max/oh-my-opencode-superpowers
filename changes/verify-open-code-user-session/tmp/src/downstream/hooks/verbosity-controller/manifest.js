import { createVerbosityControllerHook } from "../../../hooks/verbosity-controller";
export const manifest = {
    name: "verbosity-controller",
    lifecycle: ["tool.execute.after"],
    factory: createVerbosityControllerHook,
};
