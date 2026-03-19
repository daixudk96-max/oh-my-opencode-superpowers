// Note: Agent configs are created dynamically via createBuiltinAgents() in utils.ts
// This file only exports the factory functions and types
// builtinAgents is deprecated - use createBuiltinAgents() instead
export const builtinAgents = {};
export * from "./types";
export { createBuiltinAgents } from "./builtin-agents";
