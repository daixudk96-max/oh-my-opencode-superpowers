import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { createRuntimeFallbackHook } from "./hook"
import type { RuntimeFallbackPluginInput } from "./types"

function createMockContext(): RuntimeFallbackPluginInput {
  return {
    client: {
      session: {
        abort: async () => ({}),
        messages: async () => ({ data: [] }),
        promptAsync: async () => ({}),
      },
      tui: {
        showToast: async () => ({}),
      },
    },
    directory: "/test",
  }
}

describe("createRuntimeFallbackHook dispose", () => {
  const originalSetInterval = globalThis.setInterval
  const originalClearInterval = globalThis.clearInterval
  const createdIntervals: Array<ReturnType<typeof originalSetInterval>> = []
  const clearedIntervals: Array<Parameters<typeof originalClearInterval>[0]> = []

  beforeEach(() => {
    createdIntervals.length = 0
    clearedIntervals.length = 0

    globalThis.setInterval = ((handler: () => void, timeout?: number) => {
      const interval = originalSetInterval(handler, timeout)
      createdIntervals.push(interval)
      return interval
    }) as typeof globalThis.setInterval

    globalThis.clearInterval = ((interval?: Parameters<typeof clearInterval>[0]) => {
      clearedIntervals.push(interval)
      return originalClearInterval(interval)
    }) as typeof globalThis.clearInterval
  })

  afterEach(() => {
    globalThis.setInterval = originalSetInterval
    globalThis.clearInterval = originalClearInterval
  })

  test("#given runtime-fallback hook created #when dispose() is called #then cleanup interval is cleared", () => {
    const hook = createRuntimeFallbackHook(createMockContext(), { pluginConfig: {} })

    hook.dispose?.()

    expect(createdIntervals).toHaveLength(1)
    expect(clearedIntervals).toEqual([createdIntervals[0]])
  })

  test("#given runtime-fallback hook #when dispose() is called twice #then it should not throw", () => {
    const hook = createRuntimeFallbackHook(createMockContext(), { pluginConfig: {} })

    expect(() => hook.dispose?.()).not.toThrow()
    expect(() => hook.dispose?.()).not.toThrow()
  })
})
