import { createPrContextInjectorHook } from "../../../hooks/pr-context-injector";
export const manifest = {
    name: "pr-context-injector",
    lifecycle: ["chat.message"],
    factory: createPrContextInjectorHook,
};
