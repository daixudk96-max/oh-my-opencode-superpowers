import { getPlanProgress } from "./plan-progress-parser"
import { readBoulderState } from "./storage"

export function hasCompletedActivePlanForSession(
  directory: string,
  sessionID: string,
): boolean {
  const boulderState = readBoulderState(directory)
  if (!boulderState) {
    return false
  }

  const activePlan = boulderState.active_plan?.trim()
  if (!activePlan) {
    return false
  }

  if (!boulderState.session_ids.includes(sessionID)) {
    return false
  }

  return getPlanProgress(activePlan).isComplete
}
