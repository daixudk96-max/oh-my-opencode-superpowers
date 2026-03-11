import { access, readdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import type {
  AgentManifest,
  CommandManifest,
  HookManifest,
  McpManifest,
  SkillManifest,
  ToolManifest,
} from "./types"

const DEFAULT_DOWNSTREAM_ROOT = fileURLToPath(new URL(".", import.meta.url))

async function discoverCategoryManifests<T>(
  category: string,
  downstreamRoot: string = DEFAULT_DOWNSTREAM_ROOT,
): Promise<T[]> {
  const categoryDir = join(downstreamRoot, category)
  const entries = await readdir(categoryDir, { withFileTypes: true }).catch(() => [])
  const manifests: T[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const manifestPath = join(categoryDir, entry.name, "manifest.ts")
    const hasManifest = await access(manifestPath)
      .then(() => true)
      .catch(() => false)

    if (!hasManifest) continue

    const moduleUrl = pathToFileURL(manifestPath).href
    const loaded = await import(moduleUrl).catch(() => null)
    if (!loaded) continue

    const manifestValue = loaded.manifest ?? loaded.default
    if (!manifestValue) continue

    if (Array.isArray(manifestValue)) {
      manifests.push(...(manifestValue as T[]))
      continue
    }

    manifests.push(manifestValue as T)
  }

  return manifests
}

export async function discoverDownstreamHooks(
  downstreamRoot?: string,
): Promise<HookManifest[]> {
  return discoverCategoryManifests<HookManifest>("hooks", downstreamRoot)
}

export async function discoverDownstreamSkills(
  downstreamRoot?: string,
): Promise<SkillManifest[]> {
  return discoverCategoryManifests<SkillManifest>("skills", downstreamRoot)
}

export async function discoverDownstreamCommands(
  downstreamRoot?: string,
): Promise<CommandManifest[]> {
  return discoverCategoryManifests<CommandManifest>("commands", downstreamRoot)
}

export async function discoverDownstreamAgents(
  downstreamRoot?: string,
): Promise<AgentManifest[]> {
  return discoverCategoryManifests<AgentManifest>("agents", downstreamRoot)
}

export async function discoverDownstreamTools(
  downstreamRoot?: string,
): Promise<ToolManifest[]> {
  return discoverCategoryManifests<ToolManifest>("tools", downstreamRoot)
}

export async function discoverDownstreamMcps(
  downstreamRoot?: string,
): Promise<McpManifest[]> {
  return discoverCategoryManifests<McpManifest>("mcp", downstreamRoot)
}
