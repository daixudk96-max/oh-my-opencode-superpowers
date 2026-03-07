import { PROMETHEUS_AGENTS } from "./constants"

export function isPrometheusAgent(agentName: string | undefined): boolean {
  return !!agentName && PROMETHEUS_AGENTS.some(name => agentName.toLowerCase().includes(name.toLowerCase()))
}
