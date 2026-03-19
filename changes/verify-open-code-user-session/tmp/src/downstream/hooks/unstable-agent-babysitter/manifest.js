import { createUnstableAgentBabysitterHook } from "../../../hooks/unstable-agent-babysitter";
export const manifest = {
    name: "unstable-agent-babysitter",
    lifecycle: ["event"],
    factory: createUnstableAgentBabysitterHook,
};
