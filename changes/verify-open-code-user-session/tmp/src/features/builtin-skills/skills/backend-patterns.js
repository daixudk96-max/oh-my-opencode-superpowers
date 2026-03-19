import { readBuiltinSkillTemplate } from "./template-reader";
export const backendPatternGoSkill = {
    name: "backend-pattern-go",
    description: "Go backend development patterns and best practices",
    template: readBuiltinSkillTemplate("backend-pattern-go"),
};
export const backendPatternJavaSkill = {
    name: "backend-pattern-java",
    description: "Java/Spring backend patterns",
    template: readBuiltinSkillTemplate("backend-pattern-java"),
};
export const backendPatternPythonSkill = {
    name: "backend-pattern-python",
    description: "Python backend patterns (FastAPI, Django)",
    template: readBuiltinSkillTemplate("backend-pattern-python"),
};
