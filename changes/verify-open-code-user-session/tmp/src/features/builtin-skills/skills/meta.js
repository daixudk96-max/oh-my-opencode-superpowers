import { readBuiltinSkillTemplate } from "./template-reader";
export const writingSkillsSkill = {
    name: "writing-skills",
    description: "Use when creating new skills, editing existing skills, or verifying skills work before deployment",
    template: readBuiltinSkillTemplate("writing-skills"),
};
export const continuousLearningSkill = {
    name: "continuous-learning",
    description: "Continuous learning and instinct system - automatically learns from successful patterns and creates reusable instincts",
    template: readBuiltinSkillTemplate("continuous-learning"),
};
