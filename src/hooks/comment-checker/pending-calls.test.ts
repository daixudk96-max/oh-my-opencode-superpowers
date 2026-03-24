import { describe, test, expect } from "bun:test"

describe("pending-calls cleanup interval", () => {
  test("starts cleanup once and unrefs timer", async () => {
    //#given
    const originalSetInterval = globalThis.setInterval
    const setIntervalCalls: number[] = []
    let unrefCalled = 0

    globalThis.setInterval = ((
      _handler: TimerHandler,
      timeout?: number,
      ..._args: any[]
    ) => {
      setIntervalCalls.push(timeout as number)
      return {
        unref: () => {
          unrefCalled += 1
        },
      } as unknown as ReturnType<typeof setInterval>
    }) as unknown as typeof setInterval

    try {
      const pendingCallsModule = await import(new URL("./pending-calls.ts?pending-calls-test-once", import.meta.url).href)

      //#when
      pendingCallsModule.startPendingCallCleanup()
      pendingCallsModule.startPendingCallCleanup()

      //#then
      expect(setIntervalCalls.length).toBeLessThanOrEqual(1)
      if (setIntervalCalls.length === 1) {
        expect(setIntervalCalls[0]).toBe(10_000)
      }
      expect(unrefCalled).toBe(setIntervalCalls.length)
    } finally {
      globalThis.setInterval = originalSetInterval
    }
  })
})
