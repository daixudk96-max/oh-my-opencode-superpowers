import { createCodebaseAssessmentHook } from "../../../hooks/codebase-assessment";
export const manifest = {
    name: "codebase-assessment",
    lifecycle: ["tool.execute.before"],
    factory: createCodebaseAssessmentHook,
};
