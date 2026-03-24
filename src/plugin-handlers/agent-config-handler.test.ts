/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"

const agents = require("../agents")
const sisyphusJunior = require("../agents/sisyphus-junior")
const agentLoader = require("../features/claude-code-agent-loader")
const skillLoader = require("../features/opencode-skill-loader")
const shared = require("../shared")
const { getAgentDisplayName } = require("../shared/agent-display-names")
const { applyAgentConfig } = require("./agent-config-handler")

const BUILTIN_SISYPHUS_DISPLAY_NAME = getAgentDisplayName("sisyphus")
const BUILTIN_SISYPHUS_JUNIOR_DISPLAY_NAME = getAgentDisplayName("sisyphus-junior")
const BUILTIN_MULTIMODAL_LOOKER_DISPLAY_NAME = getAgentDisplayName("multimodal-looker")
const BUILTIN_PROMETHEUS_DISPLAY_NAME = getAgentDisplayName("prometheus")

function createPluginComponents() {
  return {
    commands: {},
    skills: {},
    agents: {},
    mcpServers: {},
    hooksConfigs: [],
    plugins: [],
    errors: [],
  }
}

function createBaseConfig(): Record<string, unknown> {
  return {
    model: "anthropic/claude-opus-4-6",
    agent: {},
  }
}

function createPluginConfig(
  overrides: {
    sisyphus_agent?: Record<string, unknown>
    agents?: Record<string, unknown>
  } = {},
) {
  return {
    ...overrides,
    sisyphus_agent: {
      planner_enabled: false,
      ...overrides.sisyphus_agent,
    },
  }
}

describe("applyAgentConfig builtin override protection", () => {
  let createBuiltinAgentsSpy: ReturnType<typeof spyOn>
  let createSisyphusJuniorAgentSpy: ReturnType<typeof spyOn>
  let discoverConfigSourceSkillsSpy: ReturnType<typeof spyOn>
  let discoverUserClaudeSkillsSpy: ReturnType<typeof spyOn>
  let discoverProjectClaudeSkillsSpy: ReturnType<typeof spyOn>
  let discoverOpencodeGlobalSkillsSpy: ReturnType<typeof spyOn>
  let discoverOpencodeProjectSkillsSpy: ReturnType<typeof spyOn>
  let loadUserAgentsSpy: ReturnType<typeof spyOn>
  let loadProjectAgentsSpy: ReturnType<typeof spyOn>
  let migrateAgentConfigSpy: ReturnType<typeof spyOn>
  let fetchAvailableModelsSpy: ReturnType<typeof spyOn>
  let readConnectedProvidersCacheSpy: ReturnType<typeof spyOn>
  let logSpy: ReturnType<typeof spyOn>

  const builtinSisyphusConfig = {
    name: "Builtin Sisyphus",
    prompt: "builtin prompt",
    mode: "primary",
  }

  const builtinOracleConfig = {
    name: "oracle",
    prompt: "oracle prompt",
    mode: "subagent",
  }

  const builtinMultimodalLookerConfig = {
    name: "multimodal-looker",
    prompt: "multimodal prompt",
    mode: "subagent",
  }

  const builtinAtlasConfig = {
    name: "atlas",
    prompt: "atlas prompt",
    mode: "all",
    model: "openai/gpt-5.4",
  }

  const sisyphusJuniorConfig = {
    name: "Sisyphus-Junior",
    prompt: "junior prompt",
    mode: "all",
  }

  beforeEach(() => {
    createBuiltinAgentsSpy = spyOn(agents, "createBuiltinAgents").mockResolvedValue({
      sisyphus: builtinSisyphusConfig,
      oracle: builtinOracleConfig,
      "multimodal-looker": builtinMultimodalLookerConfig,
      atlas: builtinAtlasConfig,
    })

    createSisyphusJuniorAgentSpy = spyOn(
      sisyphusJunior,
      "createSisyphusJuniorAgentWithOverrides",
    ).mockReturnValue(sisyphusJuniorConfig)

    discoverConfigSourceSkillsSpy = spyOn(
      skillLoader,
      "discoverConfigSourceSkills",
    ).mockResolvedValue([])
    discoverUserClaudeSkillsSpy = spyOn(
      skillLoader,
      "discoverUserClaudeSkills",
    ).mockResolvedValue([])
    discoverProjectClaudeSkillsSpy = spyOn(
      skillLoader,
      "discoverProjectClaudeSkills",
    ).mockResolvedValue([])
    discoverOpencodeGlobalSkillsSpy = spyOn(
      skillLoader,
      "discoverOpencodeGlobalSkills",
    ).mockResolvedValue([])
    discoverOpencodeProjectSkillsSpy = spyOn(
      skillLoader,
      "discoverOpencodeProjectSkills",
    ).mockResolvedValue([])

    loadUserAgentsSpy = spyOn(agentLoader, "loadUserAgents").mockReturnValue({})
    loadProjectAgentsSpy = spyOn(agentLoader, "loadProjectAgents").mockReturnValue({})

    fetchAvailableModelsSpy = spyOn(shared, "fetchAvailableModels").mockResolvedValue(
      new Set(["anthropic/claude-opus-4-6", "openai/gpt-5.4", "google/gemini-3.1-pro"]),
    )
    readConnectedProvidersCacheSpy = spyOn(
      shared,
      "readConnectedProvidersCache",
    ).mockReturnValue(null)

    migrateAgentConfigSpy = spyOn(shared, "migrateAgentConfig").mockImplementation(
      (config: Record<string, unknown>) => config,
    )
    logSpy = spyOn(shared, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    createBuiltinAgentsSpy.mockRestore()
    createSisyphusJuniorAgentSpy.mockRestore()
    discoverConfigSourceSkillsSpy.mockRestore()
    discoverUserClaudeSkillsSpy.mockRestore()
    discoverProjectClaudeSkillsSpy.mockRestore()
    discoverOpencodeGlobalSkillsSpy.mockRestore()
    discoverOpencodeProjectSkillsSpy.mockRestore()
    loadUserAgentsSpy.mockRestore()
    loadProjectAgentsSpy.mockRestore()
    fetchAvailableModelsSpy.mockRestore()
    readConnectedProvidersCacheSpy.mockRestore()
    migrateAgentConfigSpy.mockRestore()
    logSpy.mockRestore()
  })

  test("filters user agents whose key matches the builtin display-name alias", async () => {
    // given
    loadUserAgentsSpy.mockReturnValue({
      [BUILTIN_SISYPHUS_DISPLAY_NAME]: {
        name: BUILTIN_SISYPHUS_DISPLAY_NAME,
        prompt: "user alias prompt",
        mode: "subagent",
      },
    })

    // when
    const result = await applyAgentConfig({
      config: createBaseConfig(),
      pluginConfig: createPluginConfig(),
      ctx: { directory: "/tmp" },
      pluginComponents: createPluginComponents(),
    })

    // then
    expect(result[BUILTIN_SISYPHUS_DISPLAY_NAME]).toEqual(builtinSisyphusConfig)
  })

  test("filters user agents whose key differs from a builtin key only by case", async () => {
    // given
    loadUserAgentsSpy.mockReturnValue({
      SiSyPhUs: {
        name: "SiSyPhUs",
        prompt: "mixed-case prompt",
        mode: "subagent",
      },
    })

    // when
    const result = await applyAgentConfig({
      config: createBaseConfig(),
      pluginConfig: createPluginConfig(),
      ctx: { directory: "/tmp" },
      pluginComponents: createPluginComponents(),
    })

    // then
    expect(result[BUILTIN_SISYPHUS_DISPLAY_NAME]).toEqual(builtinSisyphusConfig)
    expect(result.SiSyPhUs).toBeUndefined()
  })

  test("filters plugin agents whose key matches the builtin display-name alias", async () => {
    // given
    const pluginComponents = createPluginComponents()
    pluginComponents.agents = {
      [BUILTIN_SISYPHUS_DISPLAY_NAME]: {
        name: BUILTIN_SISYPHUS_DISPLAY_NAME,
        prompt: "plugin alias prompt",
        mode: "subagent",
      },
    }

    // when
    const result = await applyAgentConfig({
      config: createBaseConfig(),
      pluginConfig: createPluginConfig(),
      ctx: { directory: "/tmp" },
      pluginComponents,
    })

    // then
    expect(result[BUILTIN_SISYPHUS_DISPLAY_NAME]).toEqual(builtinSisyphusConfig)
  })

  describe("#given protected builtin agents use hyphenated names", () => {
    describe("#when a user agent uses the underscored multimodal looker alias", () => {
      test("filters the override", async () => {
        // given
        loadUserAgentsSpy.mockReturnValue({
          multimodal_looker: {
            name: "multimodal_looker",
            prompt: "user multimodal alias prompt",
            mode: "subagent",
          },
        })

        // when
        const result = await applyAgentConfig({
          config: createBaseConfig(),
          pluginConfig: createPluginConfig(),
          ctx: { directory: "/tmp" },
          pluginComponents: createPluginComponents(),
        })

        // then
        expect(result[BUILTIN_MULTIMODAL_LOOKER_DISPLAY_NAME]).toEqual(builtinMultimodalLookerConfig)
        expect(result.multimodal_looker).toBeUndefined()
      })
    })

    describe("#when a user agent uses the underscored sisyphus junior alias", () => {
      test("filters the override", async () => {
        // given
        loadUserAgentsSpy.mockReturnValue({
          sisyphus_junior: {
            name: "sisyphus_junior",
            prompt: "user junior alias prompt",
            mode: "subagent",
          },
        })

        // when
        const result = await applyAgentConfig({
          config: createBaseConfig(),
          pluginConfig: createPluginConfig(),
          ctx: { directory: "/tmp" },
          pluginComponents: createPluginComponents(),
        })

        // then
        expect(result[BUILTIN_SISYPHUS_JUNIOR_DISPLAY_NAME]).toEqual(sisyphusJuniorConfig)
        expect(result.sisyphus_junior).toBeUndefined()
      })
    })
  })

  test("passes the resolved Atlas model to Sisyphus-Junior as its fallback default", async () => {
    // given

    // when
    await applyAgentConfig({
      config: createBaseConfig(),
      pluginConfig: createPluginConfig(),
      ctx: { directory: "/tmp" },
      pluginComponents: createPluginComponents(),
    })

    // then
    expect(createSisyphusJuniorAgentSpy).toHaveBeenCalledWith(undefined, "openai/gpt-5.4", false)
  })

  test("keeps Prometheus prompt_append after GPT base prompt selection", async () => {
    const result = await applyAgentConfig({
      config: createBaseConfig(),
      pluginConfig: createPluginConfig({
        sisyphus_agent: {
          planner_enabled: true,
        },
        agents: {
          prometheus: {
            model: "openai/gpt-5.4",
            prompt_append: "CUSTOM_APPEND_MARKER",
          },
        },
      }),
      ctx: { directory: "/tmp" },
      pluginComponents: createPluginComponents(),
    })

    const prompt = String(result[BUILTIN_PROMETHEUS_DISPLAY_NAME]?.prompt ?? "")

    expect(result[BUILTIN_PROMETHEUS_DISPLAY_NAME]).toEqual(
      expect.objectContaining({
        model: "openai/gpt-5.4",
      }),
    )
    expect(prompt.startsWith("CUSTOM_APPEND_MARKER")).toBe(false)
    expect(prompt.endsWith("\nCUSTOM_APPEND_MARKER")).toBe(true)
  })
})
