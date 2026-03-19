import { createProjectContextInjectorHook } from "../../../hooks/project-context-injector";
export const manifest = {
    name: "project-context-injector",
    lifecycle: ["chat.message"],
    factory: createProjectContextInjectorHook,
};
