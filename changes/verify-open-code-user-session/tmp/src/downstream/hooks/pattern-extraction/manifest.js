import { createPatternExtractionHook } from "../../../hooks/pattern-extraction";
export const manifest = {
    name: "pattern-extraction",
    lifecycle: ["event"],
    factory: createPatternExtractionHook,
};
