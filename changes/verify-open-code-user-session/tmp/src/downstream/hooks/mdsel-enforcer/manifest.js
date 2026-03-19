import { createMdselEnforcerHook } from "../../../hooks/mdsel-enforcer";
export const manifest = {
    name: "mdsel-enforcer",
    lifecycle: ["tool.execute.before"],
    factory: createMdselEnforcerHook,
};
