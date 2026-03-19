import { readBuiltinSkillTemplate } from "./template-reader";
export const securityAuditSkill = {
    name: "security-audit",
    description: "Security audit and vulnerability assessment skill",
    template: readBuiltinSkillTemplate("security-audit"),
};
export const databaseOptimizationSkill = {
    name: "database-optimization",
    description: "Database performance optimization and query analysis",
    template: readBuiltinSkillTemplate("database-optimization"),
};
