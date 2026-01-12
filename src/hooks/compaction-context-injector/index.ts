import type { SummarizeContext } from "../preemptive-compaction"
import type { PluginInput } from "@opencode-ai/plugin"
import { injectHookMessage } from "../../features/hook-message-injector"
import { log } from "../../shared/logger"

interface Todo {
  id: string
  content: string
  status: string
  priority: string
}

const SUMMARIZE_CONTEXT_PROMPT_BASE = `[COMPACTION CONTEXT INJECTION]

When summarizing this session, you MUST include the following sections in your summary:

## 1. User Requests (As-Is)
- List all original user requests exactly as they were stated
- Preserve the user's exact wording and intent

## 2. Final Goal
- What the user ultimately wanted to achieve
- The end result or deliverable expected

## 3. Work Completed
- What has been done so far
- Files created/modified
- Features implemented
- Problems solved

## 4. Remaining Tasks
- What still needs to be done
- Pending items from the original request
- Follow-up tasks identified during the work

## 5. MUST NOT Do (Critical Constraints)
- Things that were explicitly forbidden
- Approaches that failed and should not be retried
- User's explicit restrictions or preferences
- Anti-patterns identified during the session

This context is critical for maintaining continuity after compaction.
`

function formatTodoList(todos: Todo[]): string {
  if (!todos || todos.length === 0) return ""

  const lines = ["\n## 6. Current TODO List (MUST PRESERVE)", ""]
  lines.push("The following TODO list was active before compaction. After resuming, you MUST:")
  lines.push("1. Use `todoread` to verify the current state")
  lines.push("2. Continue working on incomplete tasks")
  lines.push("3. Update task status as you complete them")
  lines.push("")

  for (const todo of todos) {
    const statusIcon = todo.status === "completed" ? "✓" : todo.status === "in_progress" ? "→" : "○"
    const priorityTag = todo.priority === "high" ? "[HIGH]" : todo.priority === "low" ? "[LOW]" : ""
    lines.push(`- ${statusIcon} [${todo.status}] ${priorityTag} ${todo.content}`)
  }

  const incomplete = todos.filter(t => t.status !== "completed" && t.status !== "cancelled")
  if (incomplete.length > 0) {
    lines.push("")
    lines.push(`**${incomplete.length} task(s) remaining - continue after compaction!**`)
  }

  return lines.join("\n")
}

export interface CompactionContextInjectorOptions {
  ctx?: PluginInput
}

export function createCompactionContextInjector(options?: CompactionContextInjectorOptions) {
  const pluginCtx = options?.ctx

  return async (ctx: SummarizeContext): Promise<void> => {
    log("[compaction-context-injector] injecting context", { sessionID: ctx.sessionID })

    let todoSection = ""

    // Fetch current TODO list to preserve across compaction
    if (pluginCtx) {
      try {
        const response = await pluginCtx.client.session.todo({ path: { id: ctx.sessionID } })
        const todos = (response.data ?? response) as Todo[]
        if (todos && todos.length > 0) {
          todoSection = formatTodoList(todos)
          log("[compaction-context-injector] TODO list fetched", {
            sessionID: ctx.sessionID,
            todoCount: todos.length,
            incompleteCount: todos.filter(t => t.status !== "completed" && t.status !== "cancelled").length,
          })
        }
      } catch (err) {
        log("[compaction-context-injector] failed to fetch TODO list", {
          sessionID: ctx.sessionID,
          error: String(err),
        })
      }
    }

    const fullPrompt = SUMMARIZE_CONTEXT_PROMPT_BASE + todoSection

    const success = injectHookMessage(ctx.sessionID, fullPrompt, {
      agent: "general",
      model: { providerID: ctx.providerID, modelID: ctx.modelID },
      path: { cwd: ctx.directory },
    })

    if (success) {
      log("[compaction-context-injector] context injected", { sessionID: ctx.sessionID, hasTodos: todoSection.length > 0 })
    } else {
      log("[compaction-context-injector] injection failed", { sessionID: ctx.sessionID })
    }
  }
}
