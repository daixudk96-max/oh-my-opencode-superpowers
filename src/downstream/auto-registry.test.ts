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
  describe("#given directory does not exist", () => {
    it("#when scanning categories #then returns empty arrays without throw", async () => {
      const root = join(tmpdir(), `does-not-exist-${Date.now()}`)

      await expect(discoverDownstreamHooks(root)).resolves.toEqual([])
      await expect(discoverDownstreamSkills(root)).resolves.toEqual([])
      await expect(discoverDownstreamCommands(root)).resolves.toEqual([])
      await expect(discoverDownstreamAgents(root)).resolves.toEqual([])
      await expect(discoverDownstreamTools(root)).resolves.toEqual([])
      await expect(discoverDownstreamMcps(root)).resolves.toEqual([])
    })
  })

  describe("#given child directories without manifest.ts", () => {
    it("#when scanning #then skips invalid child directories", async () => {
      const root = createTempDownstreamRoot()
      mkdirSync(join(root, "hooks", "no-manifest"), { recursive: true })

      await expect(discoverDownstreamHooks(root)).resolves.toEqual([])
    })
  })

  describe("#given valid manifests for all categories", () => {
    it("#when scanning #then loads category manifest arrays", async () => {
      const root = createTempDownstreamRoot()

      writeManifest(root, "hooks", "hook-a", `
        export const manifest = {
          name: "hook-a",
          lifecycle: ["chat.message"],
          factory: () => ({ "chat.message": async () => {} }),
        }
      `)

      writeManifest(root, "skills", "skill-a", `
        export default {
          name: "skill-a",
          skill: { name: "skill-a", description: "desc", template: "tpl" }
        }
      `)

      writeManifest(root, "commands", "command-a", `
        export const manifest = {
          name: "command-a",
          definition: { name: "command-a", description: "desc", template: "tpl" }
        }
      `)

      writeManifest(root, "agents", "agent-a", `
        export const manifest = {
          name: "agent-a",
          factory: () => ({ mode: "subagent", description: "desc", prompt: "prompt" })
        }
      `)

      writeManifest(root, "tools", "tool-a", `
        export default {
          name: "tool-a",
          definition: {
            description: "desc",
            parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
            execute: async () => ({ title: "ok", output: "ok" })
          }
        }
      `)

      writeManifest(root, "mcp", "mcp-a", `
        export const manifest = {
          name: "mcp-a",
          configFactory: () => ({ type: "local", command: ["node", "server.js"] })
        }
      `)

      const hooks = await discoverDownstreamHooks(root)
      const skills = await discoverDownstreamSkills(root)
      const commands = await discoverDownstreamCommands(root)
      const agents = await discoverDownstreamAgents(root)
      const tools = await discoverDownstreamTools(root)
      const mcps = await discoverDownstreamMcps(root)

      expect(hooks).toHaveLength(1)
      expect(hooks[0]?.name).toBe("hook-a")

      expect(skills).toHaveLength(1)
      expect(skills[0]?.name).toBe("skill-a")

      expect(commands).toHaveLength(1)
      expect(commands[0]?.name).toBe("command-a")

      expect(agents).toHaveLength(1)
      expect(agents[0]?.name).toBe("agent-a")

      expect(tools).toHaveLength(1)
      expect(tools[0]?.name).toBe("tool-a")

      expect(mcps).toHaveLength(1)
      expect(mcps[0]?.name).toBe("mcp-a")
    })
  })
})
