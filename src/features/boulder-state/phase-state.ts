import type { BoulderState, PhaseStatus } from "./types"
import { getPlanName } from "./prometheus-plan-discovery"

export function createBoulderState(
  planPath: string,
  sessionId: string,
  agent?: string,
  worktreePath?: string,
): BoulderState {
  return {
    active_plan: planPath,
    started_at: new Date().toISOString(),
    session_ids: [sessionId],
    plan_name: getPlanName(planPath),
    phase: "idle",
    last_updated: new Date().toISOString(),
    ...(agent !== undefined ? { agent } : {}),
    ...(worktreePath !== undefined ? { worktree_path: worktreePath } : {}),
  }
}

export function applyPhaseStatus(
  state: BoulderState,
  phase: PhaseStatus,
  currentTask?: string,
): BoulderState {
  state.phase = phase
  state.last_updated = new Date().toISOString()
  if (currentTask !== undefined) {
    state.current_task = currentTask
  }

  if (phase === "executing" || phase === "planning") {
    state.failure_count = 0
    state.last_error = undefined
  }

  return state
}

export function incrementFailureCountState(
  state: BoulderState,
  errorMessage?: string,
): { state: BoulderState; count: number } {
  const count = (state.failure_count || 0) + 1
  state.failure_count = count
  state.last_error = errorMessage
  state.last_updated = new Date().toISOString()
  return { state, count }
}

export function resetFailureCountState(state: BoulderState): BoulderState {
  state.failure_count = 0
  state.last_error = undefined
  state.last_updated = new Date().toISOString()
  return state
}

export function getCurrentPhaseState(state?: BoulderState | null): PhaseStatus {
  return state?.phase || "idle"
}

export function canCallPlanningAgentsState(state?: BoulderState | null): boolean {
  const phase = getCurrentPhaseState(state)
  return phase === "idle" || phase === "planning" || phase === "reviewing"
}

export function isExecutingPhaseState(state?: BoulderState | null): boolean {
  return getCurrentPhaseState(state) === "executing"
}

export function markBoulderCompleteState(state: BoulderState): BoulderState {
  state.active_plan = ""
  state.phase = "completed"
  const now = new Date().toISOString()
  state.last_updated = now
  state.completed_at = now
  return state
}
