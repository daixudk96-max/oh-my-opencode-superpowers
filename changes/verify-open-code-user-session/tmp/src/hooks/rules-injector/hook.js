import { createDynamicTruncator } from "../../shared/dynamic-truncator";
import { getRuleInjectionFilePath } from "./output-path";
import { createSessionCacheStore } from "./cache";
import { createRuleInjectionProcessor } from "./injector";
const TRACKED_TOOLS = ["read", "write", "edit", "multiedit"];
export function createRulesInjectorHook(ctx, modelCacheState) {
    const truncator = createDynamicTruncator(ctx, modelCacheState);
    const { getSessionCache, clearSessionCache } = createSessionCacheStore();
    const { processFilePathForInjection } = createRuleInjectionProcessor({
        workspaceDirectory: ctx.directory,
        truncator,
        getSessionCache,
    });
    const toolExecuteAfter = async (input, output) => {
        const toolName = input.tool.toLowerCase();
        if (TRACKED_TOOLS.includes(toolName)) {
            const filePath = getRuleInjectionFilePath(output);
            if (!filePath)
                return;
            await processFilePathForInjection(filePath, input.sessionID, output);
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
                clearSessionCache(sessionInfo.id);
            }
        }
        if (event.type === "session.compacted") {
            const sessionID = (props?.sessionID ??
                props?.info?.id);
            if (sessionID) {
                clearSessionCache(sessionID);
            }
        }
    };
    return {
        "tool.execute.before": toolExecuteBefore,
        "tool.execute.after": toolExecuteAfter,
        event: eventHandler,
    };
}
