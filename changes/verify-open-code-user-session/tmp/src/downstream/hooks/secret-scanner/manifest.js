import { createSecretScannerHook } from "../../../hooks/secret-scanner";
export const manifest = {
    name: "secret-scanner",
    lifecycle: ["tool.execute.before"],
    factory: createSecretScannerHook,
};
