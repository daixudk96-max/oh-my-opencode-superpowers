// TDD-EXEMPT: reason="Path migration to root-anchored planner paths"
import { isAbsolute, relative, resolve } from "node:path"

export type PlannerPathKind =
  | "plan"
  | "draft"
  | "changes-md"
  | "docs-md"
  | "boulder-state"
  | "run-continuation"
  | "forbidden"

function getWorkspaceRelativePath(filePath: string, workspaceRoot: string): string | undefined {
  const resolved = resolve(workspaceRoot, filePath)
  const rel = relative(workspaceRoot, resolved)

  if (rel.startsWith("..") || isAbsolute(rel)) {
    return undefined
  }

  return rel.replace(/\\/g, "/")
}

/**
 * Cross-platform path validator for Prometheus file writes.
 * Uses path.resolve/relative instead of string matching to handle:
 * - Windows backslashes (e.g., changes/tasks.md)
 * - Mixed separators (e.g., changes/x.md)
 * - Case-insensitive directory/extension matching
 * - Workspace confinement (blocks paths outside root or via traversal)
 * - Root-anchored matching for planner artifacts
 */
export function classifyPlannerPath(filePath: string, workspaceRoot: string): PlannerPathKind {
  const relativePath = getWorkspaceRelativePath(filePath, workspaceRoot)
  if (!relativePath) {
    return "forbidden"
  }

  const segments = relativePath.split("/").filter(Boolean)
  if (segments.length === 0) {
    return "forbidden"
  }

  const lowerSegments = segments.map(segment => segment.toLowerCase())
  const [rootSegment, secondSegment, thirdSegment] = lowerSegments
  const fileName = lowerSegments.at(-1)
  const isMarkdown = fileName?.endsWith(".md") ?? false
  const isJson = fileName?.endsWith(".json") ?? false

  if (rootSegment === "changes" && isMarkdown && lowerSegments.length >= 3) {
    if (fileName === "tasks.md") {
      return "plan"
    }

    if (fileName === "proposal.md") {
      return "draft"
    }

    return "changes-md"
  }

  if (rootSegment === "docs" && isMarkdown && lowerSegments.length >= 2) {
    return "docs-md"
  }

  if (rootSegment === ".sisyphus" && secondSegment === "boulder.json" && lowerSegments.length === 2) {
    return "boulder-state"
  }

  if (
    rootSegment === ".sisyphus"
    && secondSegment === "run-continuation"
    && isJson
    && lowerSegments.length >= 3
    && thirdSegment !== undefined
  ) {
    return "run-continuation"
  }

  return "forbidden"
}

export function isAllowedFile(filePath: string, workspaceRoot: string): boolean {
  return classifyPlannerPath(filePath, workspaceRoot) !== "forbidden"
}

export function isPlanFile(filePath: string, workspaceRoot: string): boolean {
  return classifyPlannerPath(filePath, workspaceRoot) === "plan"
}
