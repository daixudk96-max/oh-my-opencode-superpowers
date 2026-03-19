import { join } from "path";
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { getClaudeConfigDir } from "../../shared";
const TODO_DIR = join(getClaudeConfigDir(), "todos");
export function getTodoPath(sessionId) {
    return join(TODO_DIR, `${sessionId}-agent-${sessionId}.json`);
}
function ensureTodoDir() {
    if (!existsSync(TODO_DIR)) {
        mkdirSync(TODO_DIR, { recursive: true });
    }
}
function toClaudeCodeFormat(item) {
    return {
        content: item.content,
        status: item.status === "cancelled" ? "completed" : item.status,
        activeForm: item.content,
    };
}
export function loadTodoFile(sessionId) {
    const path = getTodoPath(sessionId);
    if (!existsSync(path))
        return null;
    try {
        const content = JSON.parse(readFileSync(path, "utf-8"));
        if (Array.isArray(content)) {
            return {
                session_id: sessionId,
                items: content.map((item, idx) => ({
                    id: String(idx),
                    content: item.content,
                    status: item.status,
                    created_at: new Date().toISOString(),
                })),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        }
        return content;
    }
    catch {
        return null;
    }
}
export function saveTodoFile(sessionId, file) {
    ensureTodoDir();
    const path = getTodoPath(sessionId);
    const claudeCodeFormat = file.items.map(toClaudeCodeFormat);
    writeFileSync(path, JSON.stringify(claudeCodeFormat, null, 2));
}
export function saveOpenCodeTodos(sessionId, todos) {
    ensureTodoDir();
    const path = getTodoPath(sessionId);
    const claudeCodeFormat = todos.map(toClaudeCodeFormat);
    writeFileSync(path, JSON.stringify(claudeCodeFormat, null, 2));
}
export function deleteTodoFile(sessionId) {
    const path = getTodoPath(sessionId);
    if (existsSync(path)) {
        unlinkSync(path);
    }
}
