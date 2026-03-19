import { createPhaseRulesInjectorHook } from "../../../hooks/phase-rules-injector";
export const manifest = {
    name: "phase-rules-injector",
    lifecycle: ["chat.message"],
    factory: createPhaseRulesInjectorHook,
};
