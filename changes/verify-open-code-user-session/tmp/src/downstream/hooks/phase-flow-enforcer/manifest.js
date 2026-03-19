import { createPhaseFlowEnforcerHook } from "../../../hooks/phase-flow-enforcer";
export const manifest = {
    name: "phase-flow-enforcer",
    lifecycle: ["tool.execute.after"],
    factory: createPhaseFlowEnforcerHook,
};
