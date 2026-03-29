import { hasCompletedActivePlanForSession } from "../../features/boulder-state"

import type { SessionStateStore } from "./session-state"

type CompletedPlanGuardSessionStateStore = Pick<
  SessionStateStore,
  "resetContinuationProgress"
>

export function shouldSkipStaleContinuationForCompletedPlan(
  directory: string,
  sessionID: string,
  sessionStateStore: CompletedPlanGuardSessionStateStore,
): boolean {
  if (!hasCompletedActivePlanForSession(directory, sessionID)) {
    return false
  }

  sessionStateStore.resetContinuationProgress(sessionID)
  return true
}
