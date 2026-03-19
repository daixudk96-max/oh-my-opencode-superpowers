import { HOOK_MANIFESTS, SKILL_MANIFESTS, COMMAND_MANIFESTS, AGENT_MANIFESTS, } from "./generated-registry";
export async function discoverDownstreamHooks() {
    return HOOK_MANIFESTS;
}
export async function discoverDownstreamSkills() {
    return SKILL_MANIFESTS;
}
export async function discoverDownstreamCommands() {
    return COMMAND_MANIFESTS;
}
export async function discoverDownstreamAgents() {
    return AGENT_MANIFESTS;
}
export async function discoverDownstreamTools() {
    return [];
}
export async function discoverDownstreamMcps() {
    return [];
}
