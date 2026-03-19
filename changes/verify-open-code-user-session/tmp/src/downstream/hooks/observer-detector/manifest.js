import { createObserverDetectorHook } from "../../../hooks/observer-detector";
export const manifest = {
    name: "observer-detector",
    lifecycle: ["tool.execute.after", "event"],
    factory: createObserverDetectorHook,
};
