import { createLspDiagnosticsEnforcerHook } from "../../../hooks/lsp-diagnostics-enforcer";
export const manifest = {
    name: "lsp-diagnostics-enforcer",
    lifecycle: ["tool.execute.after"],
    factory: createLspDiagnosticsEnforcerHook,
};
