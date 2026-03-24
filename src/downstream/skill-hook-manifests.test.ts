import { describe, expect, test } from "bun:test"
import { bootstrapDownstreamHooks } from "./runtime-hook-executor"
import type { HookLifecycle, HookManifest } from "./types"

describe("skill hook manifests", () => {
  const createChatLifecycleManifest = (name: string, calls: string[]): HookManifest => {
    return {
      name,
      lifecycle: ["chat.message"] as HookLifecycle[],
      factory: () => ({
        "chat.message": async (): Promise<void> => {
          calls.push(name)
        },
      }),
    }
  }

  const buildDownstreamHooks = async (disabledHooks?: Set<string>) => {
    const skillSuggestionCalls: string[] = []
    const skillAutoTriggerCalls: string[] = []
    const manifests: HookManifest[] = [
      createChatLifecycleManifest("skill-suggestion", skillSuggestionCalls),
      createChatLifecycleManifest("skill-auto-trigger", skillAutoTriggerCalls),
    ]

    const downstreamHooks = await bootstrapDownstreamHooks({
      ctx: { directory: process.cwd() } as never,
      manifests,
      disabledHooks,
    })

    return { downstreamHooks, skillSuggestionCalls, skillAutoTriggerCalls }
  }

  test("#given both skill manifests enabled #when bootstrapping #then both handlers run and parseHookName still recognizes both names", async () => {
    // given
    const { downstreamHooks, skillSuggestionCalls, skillAutoTriggerCalls } = await buildDownstreamHooks()

    // when
    await downstreamHooks.runChatMessage({}, {})

    // then
    expect(skillSuggestionCalls).toEqual(["skill-suggestion"])
    expect(skillAutoTriggerCalls).toEqual(["skill-auto-trigger"])
    expect(downstreamHooks.parseHookName("skill-suggestion")).toBe("skill-suggestion")
    expect(downstreamHooks.parseHookName("skill-auto-trigger")).toBe("skill-auto-trigger")
    expect(downstreamHooks.parseHookName("not-a-hook")).toBeNull()
  })

  test("#given skill-suggestion disabled #when running chat handlers #then only skill-auto-trigger executes while both names still parse", async () => {
    // given
    const disabledHooks = new Set<string>(["skill-suggestion"])
    const { downstreamHooks, skillSuggestionCalls, skillAutoTriggerCalls } = await buildDownstreamHooks(disabledHooks)

    // when
    await downstreamHooks.runChatMessage({}, {})

    // then
    expect(skillSuggestionCalls).toEqual([])
    expect(skillAutoTriggerCalls).toEqual(["skill-auto-trigger"])
    expect(downstreamHooks.parseHookName("skill-suggestion")).toBe("skill-suggestion")
    expect(downstreamHooks.parseHookName("skill-auto-trigger")).toBe("skill-auto-trigger")
  })

  test("#given skill-auto-trigger disabled #when running chat handlers #then only skill-suggestion executes while both names still parse", async () => {
    // given
    const disabledHooks = new Set<string>(["skill-auto-trigger"])
    const { downstreamHooks, skillSuggestionCalls, skillAutoTriggerCalls } = await buildDownstreamHooks(disabledHooks)

    // when
    await downstreamHooks.runChatMessage({}, {})

    // then
    expect(skillSuggestionCalls).toEqual(["skill-suggestion"])
    expect(skillAutoTriggerCalls).toEqual([])
    expect(downstreamHooks.parseHookName("skill-suggestion")).toBe("skill-suggestion")
    expect(downstreamHooks.parseHookName("skill-auto-trigger")).toBe("skill-auto-trigger")
  })
})
