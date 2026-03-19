import { log } from "../../shared/logger";
function mapTaskStatusToTodoStatus(taskStatus) {
    switch (taskStatus) {
        case "pending":
            return "pending";
        case "in_progress":
            return "in_progress";
        case "completed":
            return "completed";
        case "deleted":
            return null;
        default:
            return "pending";
    }
}
function extractPriority(metadata) {
    if (!metadata)
        return undefined;
    const priority = metadata.priority;
    if (typeof priority === "string" &&
        ["low", "medium", "high"].includes(priority)) {
        return priority;
    }
    return undefined;
}
function todosMatch(todo1, todo2) {
    if (todo1.id && todo2.id) {
        return todo1.id === todo2.id;
    }
    return todo1.content === todo2.content;
}
export function syncTaskToTodo(task) {
    const todoStatus = mapTaskStatusToTodoStatus(task.status);
    if (todoStatus === null) {
        return null;
    }
    return {
        id: task.id,
        content: task.subject,
        status: todoStatus,
        priority: extractPriority(task.metadata),
    };
}
async function resolveTodoWriter() {
    try {
        const loader = "opencode/session/todo";
        const mod = await import(loader);
        const update = mod.Todo?.update;
        if (typeof update === "function") {
            return update;
        }
    }
    catch (err) {
        log("[todo-sync] Failed to resolve Todo.update", { error: String(err) });
    }
    return null;
}
function extractTodos(response) {
    const payload = response;
    if (Array.isArray(payload?.data)) {
        return payload.data;
    }
    if (Array.isArray(response)) {
        return response;
    }
    return [];
}
export async function syncTaskTodoUpdate(ctx, task, sessionID, writer) {
    if (!ctx)
        return;
    try {
        const response = await ctx.client.session.todo({
            path: { id: sessionID },
        });
        const currentTodos = extractTodos(response);
        const taskTodo = syncTaskToTodo(task);
        const nextTodos = currentTodos.filter((todo) => {
            if (taskTodo) {
                return !todosMatch(todo, taskTodo);
            }
            // Deleted task: match by id if present, otherwise by content
            if (todo.id) {
                return todo.id !== task.id;
            }
            return todo.content !== task.subject;
        });
        const todo = taskTodo;
        if (todo) {
            nextTodos.push(todo);
        }
        const resolvedWriter = writer ?? (await resolveTodoWriter());
        if (!resolvedWriter)
            return;
        await resolvedWriter({ sessionID, todos: nextTodos });
    }
    catch (err) {
        log("[todo-sync] Failed to sync task todo", {
            error: String(err),
            sessionID,
        });
    }
}
export async function syncAllTasksToTodos(ctx, tasks, sessionID, writer) {
    try {
        let currentTodos = [];
        try {
            const response = await ctx.client.session.todo({
                path: { id: sessionID || "" },
            });
            currentTodos = extractTodos(response);
        }
        catch (err) {
            log("[todo-sync] Failed to fetch current todos", {
                error: String(err),
                sessionID,
            });
        }
        const newTodos = [];
        const tasksToRemove = new Set();
        const allTaskSubjects = new Set();
        for (const task of tasks) {
            allTaskSubjects.add(task.subject);
            const todo = syncTaskToTodo(task);
            if (todo === null) {
                tasksToRemove.add(task.id);
            }
            else {
                newTodos.push(todo);
            }
        }
        const finalTodos = [];
        const removedTaskSubjects = new Set(tasks.filter((t) => t.status === "deleted").map((t) => t.subject));
        for (const existing of currentTodos) {
            const isInNewTodos = newTodos.some((newTodo) => todosMatch(existing, newTodo));
            const isRemovedById = existing.id ? tasksToRemove.has(existing.id) : false;
            const isRemovedByContent = !existing.id && removedTaskSubjects.has(existing.content);
            const isReplacedByTask = !existing.id && allTaskSubjects.has(existing.content);
            if (!isInNewTodos && !isRemovedById && !isRemovedByContent && !isReplacedByTask) {
                finalTodos.push(existing);
            }
        }
        finalTodos.push(...newTodos);
        const resolvedWriter = writer ?? (await resolveTodoWriter());
        if (resolvedWriter && sessionID) {
            await resolvedWriter({ sessionID, todos: finalTodos });
        }
        log("[todo-sync] Synced todos", {
            count: finalTodos.length,
            sessionID,
        });
    }
    catch (err) {
        log("[todo-sync] Error in syncAllTasksToTodos", {
            error: String(err),
            sessionID,
        });
    }
}
