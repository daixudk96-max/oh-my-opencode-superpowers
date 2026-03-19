import { z } from "zod";
export const BuiltinAgentNameSchema = z.enum([
    "sisyphus",
    "hephaestus",
    "prometheus",
    "oracle",
    "librarian",
    "explore",
    "multimodal-looker",
    "metis",
    "momus",
    "atlas",
]);
export const BuiltinSkillNameSchema = z.enum([
    "playwright",
    "agent-browser",
    "dev-browser",
    "frontend-ui-ux",
    "git-master",
]);
export const OverridableAgentNameSchema = z.enum([
    "build",
    "plan",
    "sisyphus",
    "hephaestus",
    "sisyphus-junior",
    "OpenCode-Builder",
    "prometheus",
    "metis",
    "momus",
    "oracle",
    "librarian",
    "explore",
    "multimodal-looker",
    "atlas",
]);
export const AgentNameSchema = BuiltinAgentNameSchema;
