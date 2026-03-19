import type { PluginInput } from "@opencode-ai/plugin"
import type { DownstreamHookBootstrapResult } from "../../src/downstream/runtime-hook-executor"
import pluginFactory from "../../src/index"

type HookCounts = {
  before: number
  after: number
  userPrompt: number
}

const counts: HookCounts = { before: 0, after: 0, userPrompt: 0 }
const metadataLog: string[] = []

const downstreamStub: DownstreamHookBootstrapResult = {
  parseHookName: () => null,
  runChatMessage: async () => {},
  runEvent: async () => {},
  runExperimentalSessionCompacting: async () => {},
  runToolExecuteBefore: async (input) => {
    const typed = input as { tool?: string; sessionID?: string }
    metadataLog.push(
      `[downstream] runToolExecuteBefore tool=${typed.tool ?? "<unknown>"} session=${typed.sessionID ?? "<unknown>"}`,
    )
    counts.before += 1
  },
  runToolExecuteAfter: async (input) => {
    const typed = input as { tool?: string; sessionID?: string }
    metadataLog.push(
      `[downstream] runToolExecuteAfter tool=${typed.tool ?? "<unknown>"} session=${typed.sessionID ?? "<unknown>"}`,
    )
    counts.after += 1
  },
  runUserPromptSubmit: async (input) => {
    const typed = input as { prompt?: string; sessionID?: string }
    metadataLog.push(
      `[downstream] runUserPromptSubmit prompt=${JSON.stringify(typed.prompt)} session=${typed.sessionID ?? "<unknown>"}`,
    )
    counts.userPrompt += 1
  },
}

globalThis.__ohMyOpenCodeDownstreamHooksOverride = async () => downstreamStub

const pluginInput: PluginInput = {
  directory: process.cwd(),
  client: {} as PluginInput["client"],
  project: {} as PluginInput["project"],
  worktree: process.cwd(),
  serverUrl: new URL("http://localhost"),
  $: {} as PluginInput["$"],
}

async function runVerification(): Promise<void> {
  const pluginInterface = await pluginFactory(pluginInput)

  const toolPayload = {
    tool: "verify-tool",
    sessionID: "verify-session",
    callID: "verify-call",
  }

  const toolArgs = { foo: "bar" }
  await pluginInterface["tool.execute.before"]?.(toolPayload as never, { args: toolArgs } as never)
  await pluginInterface["tool.execute.after"]?.(
    toolPayload as never,
    { title: "ok", output: "result", metadata: { ok: true } } as never,
  )

  const userPromptHandler = (
    pluginInterface as { UserPromptSubmit?: (input: unknown, output: unknown) => Promise<void> }
  ).UserPromptSubmit

  if (!userPromptHandler) {
    throw new Error("UserPromptSubmit handler missing from plugin interface")
  }

  await userPromptHandler(
    { prompt: "/verify-hooks", sessionID: toolPayload.sessionID } as never,
    { blocked: false } as never,
  )

  if (counts.before !== 1 || counts.after !== 1 || counts.userPrompt !== 1) {
    throw new Error(
      `Expected each downstream hook once (before=${counts.before}, after=${counts.after}, userPrompt=${counts.userPrompt})`,
    )
  }

  console.log(`Sample metadata: tool=${toolPayload.tool}, session=${toolPayload.sessionID}, args=${JSON.stringify(toolArgs)}`)
  metadataLog.forEach((entry) => {
    console.log(entry)
  })

  const summaryLine = `[verify] Summary: downstream spies saw tool.execute.before=${counts.before}, tool.execute.after=${counts.after}, UserPromptSubmit=${counts.userPrompt}`
  console.log(summaryLine)
  console.log("Verified plugin wrappers; downstream hooks triggered")
}

runVerification()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("Verification failed", error)
    process.exit(1)
  })
