import { createDynamicTruncator } from "../../shared/dynamic-truncator";
import { processFilePathForReadmeInjection } from "./injector";
import { clearInjectedPaths } from "./storage";
export function createDirectoryReadmeInjectorHook(ctx, modelCacheState) {
    const sessionCaches = new Map();
    const truncator = createDynamicTruncator(ctx, modelCacheState);
    const toolExecuteAfter = async (input, output) => {
        const toolName = input.tool.toLowerCase();
        if (toolName === "read") {
            await processFilePathForReadmeInjection({
                ctx,
                truncator,
                sessionCaches,
                filePath: output.title,
                sessionID: input.sessionID,
                output,
            });
            return;
        }
    };
    const toolExecuteBefore = async (input, output) => {
        void input;
        void output;
    };
    const eventHandler = async ({ event }) => {
        const props = event.properties;
        if (event.type === "session.deleted") {
            const sessionInfo = props?.info;
            if (sessionInfo?.id) {
                sessionCaches.delete(sessionInfo.id);
                clearInjectedPaths(sessionInfo.id);
            }
        }
        if (event.type === "session.compacted") {
            const sessionID = (props?.sessionID ??
                props?.info?.id);
            if (sessionID) {
                sessionCaches.delete(sessionID);
                clearInjectedPaths(sessionID);
            }
        }
    };
    return {
        "tool.execute.before": toolExecuteBefore,
        "tool.execute.after": toolExecuteAfter,
        event: eventHandler,
    };
}
