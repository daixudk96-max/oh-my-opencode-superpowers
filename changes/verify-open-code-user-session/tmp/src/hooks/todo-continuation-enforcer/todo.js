export function getIncompleteCount(todos) {
    return todos.filter((todo) => todo.status !== "completed"
        && todo.status !== "cancelled"
        && todo.status !== "blocked"
        && todo.status !== "deleted").length;
}
