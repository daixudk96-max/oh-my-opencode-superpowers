const {
  describe: bunDescribe,
  test: bunTest,
  expect: bunExpect,
  mock: bunMock,
} = require("bun:test")

type PromptRequest = {
  body: {
    tools: Record<string, boolean>
    parts: Array<{ type: string; text: string }>
  }
}

function createPromptCapture() {
  let promptArgs: PromptRequest | undefined
  const promptAsync = bunMock(async (input: PromptRequest) => {
    promptArgs = input
    return { data: {} }
  })

  return {
    promptAsync,
    mockClient: {
      session: {
        promptAsync,
      },
    },
    getPromptArgs() {
      if (!promptArgs) {
        throw new Error("Expected prompt args to be captured")
      }

      return promptArgs
    },
  }
}

bunDescribe("sendSyncPrompt", () => {
  bunTest("passes question=false via tools parameter", async () => {
    //#given
    const { sendSyncPrompt } = require("./sync-prompt-sender")
    const { getPromptArgs, mockClient, promptAsync } = createPromptCapture()

    const input = {
      sessionID: "test-session",
      agentToUse: "sisyphus-junior",
      args: {
        description: "test task",
        prompt: "test prompt",
        run_in_background: false,
        load_skills: [],
      },
      systemContent: undefined,
      categoryModel: undefined,
      toastManager: null,
      taskId: undefined,
    }

    //#when
    await sendSyncPrompt(mockClient, input)

    //#then
    bunExpect(promptAsync).toHaveBeenCalled()
    bunExpect(getPromptArgs().body.tools.question).toBe(false)
  })

  bunTest("sends the buildTaskPrompt output without transport reordering", async () => {
    //#given
    const { sendSyncPrompt } = require("./sync-prompt-sender")
    const { buildTaskPrompt } = require("./prompt-builder")
    const {
      OMO_INTERNAL_INITIATOR_MARKER,
    } = require("../../shared/internal-initiator-marker")
    const { getPromptArgs, mockClient, promptAsync } = createPromptCapture()

    const input = {
      sessionID: "test-session",
      agentToUse: "plan",
      args: {
        description: "test task",
        prompt: "Plan the migration",
        run_in_background: false,
        load_skills: [],
      },
      systemContent: undefined,
      categoryModel: undefined,
      toastManager: null,
      taskId: undefined,
    }

    //#when
    await sendSyncPrompt(mockClient, input)

    //#then
    const expectedPrompt = buildTaskPrompt(input.args.prompt, input.agentToUse)
    bunExpect(promptAsync).toHaveBeenCalled()
    bunExpect(getPromptArgs().body.parts[0]).toEqual({
      type: "text",
      text: `${expectedPrompt}\n${OMO_INTERNAL_INITIATOR_MARKER}`,
    })
  })

  bunTest("passes through the plan-family prompt builder output for prometheus", async () => {
    //#given
    const { sendSyncPrompt } = require("./sync-prompt-sender")
    const { buildTaskPrompt } = require("./prompt-builder")
    const {
      OMO_INTERNAL_INITIATOR_MARKER,
    } = require("../../shared/internal-initiator-marker")
    const { getPromptArgs, mockClient, promptAsync } = createPromptCapture()

    const input = {
      sessionID: "test-session",
      agentToUse: "prometheus",
      args: {
        description: "test task",
        prompt: "Prepare the task handoff",
        run_in_background: false,
        load_skills: [],
      },
      systemContent: undefined,
      categoryModel: undefined,
      toastManager: null,
      taskId: undefined,
    }

    //#when
    await sendSyncPrompt(mockClient, input)

    //#then
    const expectedPrompt = buildTaskPrompt(input.args.prompt, input.agentToUse)
    const promptText = getPromptArgs().body.parts[0].text
    const plannerSubset = "When you report the plan or open questions, use plain language."
    bunExpect(promptAsync).toHaveBeenCalled()
    bunExpect(getPromptArgs().body.tools.task).toBe(true)
    bunExpect(getPromptArgs().body.parts[0]).toEqual({
      type: "text",
      text: `${expectedPrompt}\n${OMO_INTERNAL_INITIATOR_MARKER}`,
    })
    bunExpect(promptText).toContain(plannerSubset)
    bunExpect(promptText.includes("Never report work as done until you verify it")).toBe(false)
    bunExpect(
      promptText.indexOf(plannerSubset) < promptText.indexOf(OMO_INTERNAL_INITIATOR_MARKER)
    ).toBe(true)
  })

  bunTest("applies agent tool restrictions for explore agent", async () => {
    //#given
    const { sendSyncPrompt } = require("./sync-prompt-sender")
    const { getPromptArgs, mockClient, promptAsync } = createPromptCapture()

    const input = {
      sessionID: "test-session",
      agentToUse: "explore",
      args: {
        description: "test task",
        prompt: "test prompt",
        category: "quick",
        run_in_background: false,
        load_skills: [],
      },
      systemContent: undefined,
      categoryModel: undefined,
      toastManager: null,
      taskId: undefined,
    }

    //#when
    await sendSyncPrompt(mockClient, input)

    //#then
    bunExpect(promptAsync).toHaveBeenCalled()
    bunExpect(getPromptArgs().body.tools.call_omo_agent).toBe(false)
  })

  bunTest("applies agent tool restrictions for librarian agent", async () => {
    //#given
    const { sendSyncPrompt } = require("./sync-prompt-sender")
    const { getPromptArgs, mockClient, promptAsync } = createPromptCapture()

    const input = {
      sessionID: "test-session",
      agentToUse: "librarian",
      args: {
        description: "test task",
        prompt: "test prompt",
        category: "quick",
        run_in_background: false,
        load_skills: [],
      },
      systemContent: undefined,
      categoryModel: undefined,
      toastManager: null,
      taskId: undefined,
    }

    //#when
    await sendSyncPrompt(mockClient, input)

    //#then
    bunExpect(promptAsync).toHaveBeenCalled()
    bunExpect(getPromptArgs().body.tools.call_omo_agent).toBe(false)
  })

  bunTest("does not restrict call_omo_agent for sisyphus agent", async () => {
    //#given
    const { sendSyncPrompt } = require("./sync-prompt-sender")
    const { getPromptArgs, mockClient, promptAsync } = createPromptCapture()

    const input = {
      sessionID: "test-session",
      agentToUse: "sisyphus",
      args: {
        description: "test task",
        prompt: "test prompt",
        category: "quick",
        run_in_background: false,
        load_skills: [],
      },
      systemContent: undefined,
      categoryModel: undefined,
      toastManager: null,
      taskId: undefined,
    }

    //#when
    await sendSyncPrompt(mockClient, input)

    //#then
    bunExpect(promptAsync).toHaveBeenCalled()
    bunExpect(getPromptArgs().body.tools.call_omo_agent).toBe(true)
  })

  bunTest("retries with promptSync for oracle when promptAsync fails with unexpected EOF", async () => {
    //#given
    const { sendSyncPrompt } = require("./sync-prompt-sender")

    const promptWithModelSuggestionRetry = bunMock(async () => {
      throw new Error("JSON Parse error: Unexpected EOF")
    })
    const promptSyncWithModelSuggestionRetry = bunMock(async () => {})

    const input = {
      sessionID: "test-session",
      agentToUse: "oracle",
      args: {
        description: "test task",
        prompt: "test prompt",
        run_in_background: false,
        load_skills: [],
      },
      systemContent: undefined,
      categoryModel: undefined,
      toastManager: null,
      taskId: undefined,
    }

    //#when
    const result = await sendSyncPrompt(
      { session: { promptAsync: bunMock(async () => ({ data: {} })) } },
      input,
      {
        promptWithModelSuggestionRetry,
        promptSyncWithModelSuggestionRetry,
      },
    )

    //#then
    bunExpect(result).toBeNull()
    bunExpect(promptWithModelSuggestionRetry).toHaveBeenCalledTimes(1)
    bunExpect(promptSyncWithModelSuggestionRetry).toHaveBeenCalledTimes(1)
  })

  bunTest("does not retry with promptSync for non-oracle on unexpected EOF", async () => {
    //#given
    const { sendSyncPrompt } = require("./sync-prompt-sender")

    const promptWithModelSuggestionRetry = bunMock(async () => {
      throw new Error("JSON Parse error: Unexpected EOF")
    })
    const promptSyncWithModelSuggestionRetry = bunMock(async () => {})

    const input = {
      sessionID: "test-session",
      agentToUse: "metis",
      args: {
        description: "test task",
        prompt: "test prompt",
        run_in_background: false,
        load_skills: [],
      },
      systemContent: undefined,
      categoryModel: undefined,
      toastManager: null,
      taskId: undefined,
    }

    //#when
    const result = await sendSyncPrompt(
      { session: { promptAsync: bunMock(async () => ({ data: {} })) } },
      input,
      {
        promptWithModelSuggestionRetry,
        promptSyncWithModelSuggestionRetry,
      },
    )

    //#then
    bunExpect(result).toContain("JSON Parse error: Unexpected EOF")
    bunExpect(promptWithModelSuggestionRetry).toHaveBeenCalledTimes(1)
    bunExpect(promptSyncWithModelSuggestionRetry).toHaveBeenCalledTimes(0)
  })
})
