import { log } from "../../shared/logger";
const HOOK_NAME = "compaction-todo-preserver";
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
async function resolveTodoWriter() {
    try {
        const loader = "opencode/session/todo";
        const mod = (await import(loader));
        const update = mod.Todo?.update;
        if (typeof update === "function") {
            return update;
        }
    }
    catch (err) {
        log(`[${HOOK_NAME}] Failed to resolve Todo.update`, { error: String(err) });
    }
    return null;
}
function resolveSessionID(props) {
    return (props?.sessionID ??
        props?.info?.id);
}
export function createCompactionTodoPreserverHook(ctx) {
    const snapshots = new Map();
    const capture = async (sessionID) => {
        if (!sessionID)
            return;
        try {
            const response = await ctx.client.session.todo({ path: { id: sessionID } });
            const todos = extractTodos(response);
            if (todos.length === 0)
                return;
            snapshots.set(sessionID, todos);
            log(`[${HOOK_NAME}] Captured todo snapshot`, { sessionID, count: todos.length });
        }
        catch (err) {
            log(`[${HOOK_NAME}] Failed to capture todos`, { sessionID, error: String(err) });
        }
    };
    const restore = async (sessionID) => {
        const snapshot = snapshots.get(sessionID);
        if (!snapshot || snapshot.length === 0)
            return;
        let hasCurrent = false;
        let currentTodos = [];
        try {
            const response = await ctx.client.session.todo({ path: { id: sessionID } });
            currentTodos = extractTodos(response);
            hasCurrent = true;
        }
        catch (err) {
            log(`[${HOOK_NAME}] Failed to fetch todos post-compaction`, { sessionID, error: String(err) });
        }
        if (hasCurrent && currentTodos.length > 0) {
            snapshots.delete(sessionID);
            log(`[${HOOK_NAME}] Skipped restore (todos already present)`, { sessionID, count: currentTodos.length });
            return;
        }
        const writer = await resolveTodoWriter();
        if (!writer) {
            log(`[${HOOK_NAME}] Skipped restore (Todo.update unavailable)`, { sessionID });
            return;
        }
        try {
            await writer({ sessionID, todos: snapshot });
            log(`[${HOOK_NAME}] Restored todos after compaction`, { sessionID, count: snapshot.length });
        }
        catch (err) {
            log(`[${HOOK_NAME}] Failed to restore todos`, { sessionID, error: String(err) });
        }
        finally {
            snapshots.delete(sessionID);
        }
    };
    const event = async ({ event }) => {
        const props = event.properties;
        if (event.type === "session.deleted") {
            const sessionID = resolveSessionID(props);
            if (sessionID) {
                snapshots.delete(sessionID);
            }
            return;
        }
        if (event.type === "session.compacted") {
            const sessionID = resolveSessionID(props);
            if (sessionID) {
                await restore(sessionID);
            }
            return;
        }
    };
    return { capture, event };
}
