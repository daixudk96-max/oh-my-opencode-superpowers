import { normalizeSDKResponse } from "../shared";
export async function hasIncompleteTodos(ctx, sessionID) {
    try {
        const response = await ctx.client.session.todo({ path: { id: sessionID } });
        const todos = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
        if (!todos || todos.length === 0)
            return false;
        return todos.some((todo) => todo.status !== "completed" && todo.status !== "cancelled");
    }
    catch {
        return false;
    }
}
