import { afterEach, describe, expect, it } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  discoverDownstreamAgents,
  discoverDownstreamCommands,
  discoverDownstreamHooks,
  discoverDownstreamMcps,
  discoverDownstreamSkills,
  discoverDownstreamTools,
} from "./auto-registry"

const tempDirs: string[] = []

function createTempDownstreamRoot() {
  const root = mkdtempSync(join(tmpdir(), "downstream-auto-registry-"))
  tempDirs.push(root)
  return root
}

function writeManifest(root: string, category: string, moduleName: string, source: string) {
  const dir = join(root, category, moduleName)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "manifest.ts"), source)
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (!dir) continue
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("auto-registry", () => {
  describe("#given testing against generated-registry", () => {
    it("#when discovering #then returns arrays without throw", async () => {
      await expect(discoverDownstreamHooks()).resolves.toBeArray()
      await expect(discoverDownstreamSkills()).resolves.toBeArray()
      await expect(discoverDownstreamCommands()).resolves.toBeArray()
      await expect(discoverDownstreamAgents()).resolves.toBeArray()
      await expect(discoverDownstreamTools()).resolves.toBeArray()
      await expect(discoverDownstreamMcps()).resolves.toBeArray()
    })
  })
})
