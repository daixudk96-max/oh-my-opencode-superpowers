import { createKnowledgeInjectionHook } from "../../../hooks/knowledge-injection";
export const manifest = {
    name: "knowledge-injection",
    lifecycle: ["tool.execute.before"],
    factory: createKnowledgeInjectionHook,
};
