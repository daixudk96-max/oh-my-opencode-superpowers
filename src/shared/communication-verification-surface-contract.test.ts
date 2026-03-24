/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import {
  COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT,
  PLAIN_LANGUAGE_REPORTING_FRAGMENT,
  VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT,
} from "./communication-verification-fragments"

const repoRoot = fileURLToPath(new URL("../..", import.meta.url))

const approvedSurfaceAllowlist = [
  "src/agents/prometheus-prompt.test.ts",
  "src/agents/prometheus/behavioral-summary.ts",
  "src/agents/prometheus/gemini.ts",
  "src/agents/prometheus/gpt.ts",
  "src/shared/communication-verification-fragments.test.ts",
  "src/shared/communication-verification-fragments.ts",
  "src/shared/communication-verification-surface-contract.test.ts",
  "src/tools/delegate-task/prompt-builder.test.ts",
  "src/tools/delegate-task/prompt-builder.ts",
  "src/tools/delegate-task/sync-prompt-sender.test.ts",
] as const

const excludedSurfacePaths = [
  "src/hooks/keyword-detector/hook.ts",
  "src/hooks/compaction-context-injector/compaction-context-prompt.ts",
  "src/config/schema/agent-overrides.ts",
  "src/config/schema/categories.ts",
  "src/agents/oracle.ts",
  "src/agents/metis.ts",
] as const

const fragmentTexts = [
  PLAIN_LANGUAGE_REPORTING_FRAGMENT,
  VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT,
  COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT,
]

function getRelativeSourceFilePaths(directoryPath: string): string[] {
  const childPaths = fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.resolve(directoryPath, entry.name)

    if (entry.isDirectory()) {
      return getRelativeSourceFilePaths(entryPath)
    }

    if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      return [path.relative(repoRoot, entryPath).split("\\").join("/")]
    }

    return []
  })

  return childPaths.sort()
}

function readSource(relativePath: string): string {
  const absolutePath = path.resolve(repoRoot, relativePath)

  expect(fs.existsSync(absolutePath)).toBe(true)

  return fs.readFileSync(absolutePath, "utf8")
}

function containsFragmentImport(sourceText: string): boolean {
  return sourceText.includes("communication-verification-fragments")
}

function containsFragmentText(sourceText: string): boolean {
  return fragmentTexts.some((fragmentText) => sourceText.includes(fragmentText))
}

function isApprovedCarrierSource(sourceText: string): boolean {
  return containsFragmentImport(sourceText) || containsFragmentText(sourceText)
}

function getObservedCarrierPaths(): string[] {
  return getRelativeSourceFilePaths(path.resolve(repoRoot, "src")).filter((relativePath) => {
    return isApprovedCarrierSource(readSource(relativePath))
  })
}

const approvedSurfacePathSet = new Set<string>(approvedSurfaceAllowlist)

describe("communication verification surface contract", () => {
  describe("#given the approved carrier map", () => {
    test("locks the approved surface allowlist to the current workspace carrier map", () => {
      expect(getObservedCarrierPaths()).toEqual([...approvedSurfaceAllowlist].sort())
    })

    test("keeps every approved surface on the allowlist as a deliberate carrier", () => {
      for (const approvedSurfacePath of approvedSurfaceAllowlist) {
        expect(isApprovedCarrierSource(readSource(approvedSurfacePath))).toBe(true)
      }
    })
  })

  describe("#given the explicit exclusion list", () => {
    test("exclude list remains explicit and out of scope for approved carriers", () => {
      expect([...excludedSurfacePaths]).toEqual([
        "src/hooks/keyword-detector/hook.ts",
        "src/hooks/compaction-context-injector/compaction-context-prompt.ts",
        "src/config/schema/agent-overrides.ts",
        "src/config/schema/categories.ts",
        "src/agents/oracle.ts",
        "src/agents/metis.ts",
      ])

      const overlappingPaths = excludedSurfacePaths.filter((excludedSurfacePath) => {
        return approvedSurfacePathSet.has(excludedSurfacePath)
      })

      expect(overlappingPaths).toEqual([])

      for (const excludedSurfacePath of excludedSurfacePaths) {
        expect(fs.existsSync(path.resolve(repoRoot, excludedSurfacePath))).toBe(true)
      }
    })

    test("negative contract keeps excluded surfaces free of fragment imports and verbatim fragment text", () => {
      for (const excludedSurfacePath of excludedSurfacePaths) {
        const sourceText = readSource(excludedSurfacePath)

        expect(containsFragmentImport(sourceText)).toBe(false)
        expect(containsFragmentText(sourceText)).toBe(false)
      }
    })
  })
})
