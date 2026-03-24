import { existsSync, readdirSync, statSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import {
  LEGACY_PROMETHEUS_PLANS_DIR,
  PROMETHEUS_PLANS_DIR,
} from "./constants"

export function findPrometheusPlans(directory: string): string[] {
  const resultsMap = new Map<string, string>()

  const changesDir = join(directory, PROMETHEUS_PLANS_DIR)
  if (existsSync(changesDir)) {
    try {
      const entries = readdirSync(changesDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const tasksPath = join(changesDir, entry.name, "tasks.md")
          if (existsSync(tasksPath)) {
            resultsMap.set(entry.name, tasksPath)
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const plansDir = join(directory, LEGACY_PROMETHEUS_PLANS_DIR)
  if (existsSync(plansDir)) {
    try {
      const files = readdirSync(plansDir)
      for (const fileName of files) {
        if (fileName.endsWith(".md")) {
          const name = basename(fileName, ".md")
          if (!resultsMap.has(name)) {
            resultsMap.set(name, join(plansDir, fileName))
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const results = Array.from(resultsMap.values())
  return results.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
}

export function getPlanName(planPath: string): string {
  const fileName = basename(planPath, ".md")
  if (fileName === "tasks") {
    return basename(dirname(planPath))
  }
  return fileName
}
