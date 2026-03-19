import { PROMETHEUS_AGENTS } from "./constants";
export function isPrometheusAgent(agentName) {
    return !!agentName && PROMETHEUS_AGENTS.some(name => agentName.toLowerCase().includes(name.toLowerCase()));
}
