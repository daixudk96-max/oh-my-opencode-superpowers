import { existsSync, readFileSync } from "node:fs"
import type { PlanProgress, TaskPhaseInfo, TaskPhaseStatus } from "./types"

const PHASE_HEADER_REGEX = /^#{2,3}\s+Phase\s+\d+:/i
const BACKTICK_REGEX = /`(complete|in_progress|pending)`/i
const STATUS_REGEX = /\*\*Status:\*\*\s*(complete|in_progress|pending)/i
const ACTIONABLE_CHECKED_REGEX = /^[-*]\s*\[[xX]\]/
const ACTIONABLE_UNCHECKED_REGEX = /^[-*]\s*\[\s*\]/

function countCheckboxes(lines: string[]): { total: number; completed: number } {
  let total = 0
  let completed = 0
  for (const line of lines) {
    if (ACTIONABLE_CHECKED_REGEX.test(line)) {
      total += 1
      completed += 1
    } else if (ACTIONABLE_UNCHECKED_REGEX.test(line)) {
      total += 1
    }
  }
  return { total, completed }
}

function getUncheckedTaskName(line: string): string | null {
  if (!ACTIONABLE_UNCHECKED_REGEX.test(line)) {
    return null
  }

  const taskName = line
    .replace(/^[-*]\s*\[\s*\]\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .trim()
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .slice(0, 80)

  return taskName || null
}

export function parsePhaseStatus(
  headerLine: string,
  contentLines: string[],
): TaskPhaseStatus {
  const backtickMatch = headerLine.match(BACKTICK_REGEX)
  if (backtickMatch) {
    return backtickMatch[1].toLowerCase().replace(" ", "_") as TaskPhaseStatus
  }

  for (const line of contentLines) {
    const statusMatch = line.match(STATUS_REGEX)
    if (statusMatch) {
      return statusMatch[1].toLowerCase().replace(" ", "_") as TaskPhaseStatus
    }
  }

  return "pending"
}

export function extractPhaseName(headerLine: string): string {
  return headerLine
    .replace(/^#{2,3}\s*/, "")
    .replace(/\s*`[^`]+`\s*$/, "")
    .trim()
}

function deriveCheckboxPhaseStatus(
  total: number,
  completed: number,
): TaskPhaseStatus {
  if (completed === total) {
    return "complete"
  }
  if (completed === 0) {
    return "pending"
  }
  return "in_progress"
}

export function getPlanProgress(planPath: string): PlanProgress {
  if (!existsSync(planPath)) {
    return { total: 0, completed: 0, isComplete: true }
  }

  try {
    const content = readFileSync(planPath, "utf-8")
    const lines = content.split(/\r?\n/)

    const { total, completed } = countCheckboxes(lines)

    const phases: TaskPhaseInfo[] = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (PHASE_HEADER_REGEX.test(line)) {
        let endLine = lines.length
        for (let j = i + 1; j < lines.length; j++) {
          if (PHASE_HEADER_REGEX.test(lines[j]) || lines[j].trim() === "---") {
            endLine = j
            break
          }
        }

        const contentLines = lines.slice(i + 1, endLine)
        const { total: phaseTotal, completed: phaseCompleted } = countCheckboxes(contentLines)
        const status =
          phaseTotal > 0
            ? deriveCheckboxPhaseStatus(phaseTotal, phaseCompleted)
            : parsePhaseStatus(line, contentLines)

        phases.push({
          name: extractPhaseName(line),
          status,
          line: i + 1,
          endLine,
        })
      }
    }

    const checkboxesComplete = total === 0 || completed === total
    const phasesComplete =
      phases.length === 0 || phases.every((p) => p.status === "complete")

    return {
      total,
      completed,
      isComplete: checkboxesComplete && phasesComplete,
      phases: phases.length > 0 ? phases : undefined,
    }
  } catch {
    return { total: 0, completed: 0, isComplete: true }
  }
}

export function getFirstIncompleteTask(planPath: string): string | null {
  if (!existsSync(planPath)) {
    return null
  }

  try {
    const content = readFileSync(planPath, "utf-8")
    const lines = content.split(/\r?\n/)

    for (const line of lines) {
      const taskName = getUncheckedTaskName(line)
      if (taskName) {
        return taskName || null
      }
    }

    return null
  } catch {
    return null
  }
}
