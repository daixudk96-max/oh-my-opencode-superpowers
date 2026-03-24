import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"
import {
  BOULDER_DIR,
  BOULDER_FILE,
  LEGACY_PROMETHEUS_PLANS_DIR,
  PROMETHEUS_PLANS_DIR,
} from "./constants"
import type { BoulderState, PhaseStatus, TaskSessionState } from "./types"
import {
  normalizeTaskSessions,
  getTaskSessionFromState,
  UpsertInput,
  upsertTaskSessionInState,
} from "./task-session-state"
import {
  applyPhaseStatus,
  canCallPlanningAgentsState,
  createBoulderState,
  getCurrentPhaseState,
  incrementFailureCountState,
  isExecutingPhaseState,
  markBoulderCompleteState,
  resetFailureCountState,
} from "./phase-state"

export function getBoulderFilePath(directory: string): string {
  return join(directory, BOULDER_DIR, BOULDER_FILE)
}

export function readBoulderState(directory: string): BoulderState | null {
  const filePath = getBoulderFilePath(directory)
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = readFileSync(filePath, "utf-8")
    const parsed = JSON.parse(content)
    if (!parsed || typeof parsed !== "object") {
      return null
    }
    if (!Array.isArray(parsed.session_ids)) {
      parsed.session_ids = []
    }
    parsed.task_sessions = normalizeTaskSessions(parsed.task_sessions)
    return parsed as BoulderState
  } catch {
    return null
  }
}

export function writeBoulderState(
  directory: string,
  state: BoulderState,
): boolean {
  const filePath = getBoulderFilePath(directory)
  try {
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

export function appendSessionId(
  directory: string,
  sessionId: string,
): BoulderState | null {
  const state = readBoulderState(directory)
  if (!state) return null

  if (!state.session_ids?.includes(sessionId)) {
    if (!Array.isArray(state.session_ids)) {
      state.session_ids = []
    }
    const originalSessionIds = [...state.session_ids]
    state.session_ids.push(sessionId)
    if (writeBoulderState(directory, state)) {
      return state
    }
    state.session_ids = originalSessionIds
    return null
  }

  return state
}

export function clearBoulderState(directory: string): boolean {
  const filePath = getBoulderFilePath(directory)
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath)
    }
    return true
  } catch {
    return false
  }
}

export function getTaskSessionState(
  directory: string,
  taskKey: string,
): TaskSessionState | null {
  const state = readBoulderState(directory)
  if (!state) {
    return null
  }
  return getTaskSessionFromState(state, taskKey)
}

export function upsertTaskSessionState(
  directory: string,
  input: UpsertInput,
): BoulderState | null {
  const state = readBoulderState(directory)
  if (!state) {
    return null
  }

  const updated = upsertTaskSessionInState(state, input)
  if (writeBoulderState(directory, updated)) {
    return updated
  }

  return null
}

export function updatePhaseStatus(
  directory: string,
  phase: PhaseStatus,
  currentTask?: string,
): BoulderState | null {
  const state = readBoulderState(directory)
  if (!state) return null

  applyPhaseStatus(state, phase, currentTask)
  if (writeBoulderState(directory, state)) {
    return state
  }
  return null
}

export function incrementFailureCount(
  directory: string,
  errorMessage?: string,
): { state: BoulderState | null; count: number } {
  const state = readBoulderState(directory)
  if (!state) {
    return { state: null, count: 0 }
  }

  const result = incrementFailureCountState(state, errorMessage)
  if (writeBoulderState(directory, result.state)) {
    return { state: result.state, count: result.count }
  }

  return { state: null, count: 0 }
}

export function resetFailureCount(directory: string): BoulderState | null {
  const state = readBoulderState(directory)
  if (!state) return null

  resetFailureCountState(state)
  if (writeBoulderState(directory, state)) {
    return state
  }
  return null
}

export function getCurrentPhase(directory: string): PhaseStatus {
  const state = readBoulderState(directory)
  return getCurrentPhaseState(state)
}

export function canCallPlanningAgents(directory: string): boolean {
  const state = readBoulderState(directory)
  return canCallPlanningAgentsState(state)
}

export function isExecutingPhase(directory: string): boolean {
  const state = readBoulderState(directory)
  return isExecutingPhaseState(state)
}

export function markBoulderComplete(directory: string): BoulderState | null {
  const state = readBoulderState(directory)
  if (!state) return null

  markBoulderCompleteState(state)
  if (writeBoulderState(directory, state)) {
    return state
  }
  return null
}

export { createBoulderState } from "./phase-state"
export { getPlanProgress, getFirstIncompleteTask } from "./plan-progress-parser"
export { findPrometheusPlans, getPlanName } from "./prometheus-plan-discovery"
export { normalizeTaskSessions, isReservedTaskKey } from "./task-session-state"
