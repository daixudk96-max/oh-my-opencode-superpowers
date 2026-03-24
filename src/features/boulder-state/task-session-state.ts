import type { BoulderState, TaskSessionState } from "./types"

const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export function normalizeTaskSessions(
  value: unknown,
): Record<string, TaskSessionState> {
  if (!isPlainObject(value)) {
    return {}
  }

  const entries = Object.entries(value).filter(([key, session]) => {
    return !RESERVED_KEYS.has(key) && isPlainObject(session)
  })

  return Object.fromEntries(entries) as Record<string, TaskSessionState>
}

export function isReservedTaskKey(taskKey: string): boolean {
  return RESERVED_KEYS.has(taskKey)
}

export function getTaskSessionFromState(
  state: BoulderState,
  taskKey: string,
): TaskSessionState | null {
  if (isReservedTaskKey(taskKey)) {
    return null
  }

  const taskSessions = normalizeTaskSessions(state.task_sessions)
  return taskSessions[taskKey] ?? null
}

export interface UpsertInput {
  taskKey: string
  taskLabel: string
  taskTitle: string
  sessionId: string
  agent?: string
  category?: string
}

export function buildTaskSessionEntry(input: UpsertInput): TaskSessionState {
  return {
    task_key: input.taskKey,
    task_label: input.taskLabel,
    task_title: input.taskTitle,
    session_id: input.sessionId,
    ...(input.agent !== undefined ? { agent: input.agent } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    updated_at: new Date().toISOString(),
  }
}

export function upsertTaskSessionInState(
  state: BoulderState,
  input: UpsertInput,
): BoulderState {
  if (isReservedTaskKey(input.taskKey)) {
    return state
  }

  const taskSessions = normalizeTaskSessions(state.task_sessions)
  taskSessions[input.taskKey] = buildTaskSessionEntry(input)
  state.task_sessions = taskSessions
  return state
}
