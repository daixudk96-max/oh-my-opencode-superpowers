import { createChatMessageHandler } from "./handlers/chat-message-handler";
import { createPreCompactHandler } from "./handlers/pre-compact-handler";
import { createSessionEventHandler } from "./handlers/session-event-handler";
import { createToolExecuteAfterHandler } from "./handlers/tool-execute-after-handler";
import { createToolExecuteBeforeHandler } from "./handlers/tool-execute-before-handler";
export function createClaudeCodeHooksHook(ctx, config = {}, contextCollector) {
    return {
        "experimental.session.compacting": createPreCompactHandler(ctx, config),
        "chat.message": createChatMessageHandler(ctx, config, contextCollector),
        "tool.execute.before": createToolExecuteBeforeHandler(ctx, config),
        "tool.execute.after": createToolExecuteAfterHandler(ctx, config),
        event: createSessionEventHandler(ctx, config),
    };
}
