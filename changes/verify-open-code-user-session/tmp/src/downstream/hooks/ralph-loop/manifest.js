import { createRalphLoopHook } from "../../../hooks/ralph-loop";
export const manifest = {
    name: "ralph-loop",
    lifecycle: ["event"],
    factory: createRalphLoopHook,
};
