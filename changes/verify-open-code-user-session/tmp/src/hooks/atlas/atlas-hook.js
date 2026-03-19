import { createBoulderGatingWrapper } from "../../downstream/patches/boulder-gating-wrapper";
import { createContinuationMaxRetriesWrapper } from "../../downstream/patches/continuation-max-retries-wrapper";
import { createAtlasEventHandler } from "./event-handler";
import { createToolExecuteAfterHandler } from "./tool-execute-after";
import { createToolExecuteBeforeHandler } from "./tool-execute-before";
export function createAtlasHook(ctx, options) {
    const sessions = new Map();
    const pendingFilePaths = new Map();
    const autoCommit = options?.autoCommit ?? true;
    function getState(sessionID) {
        let state = sessions.get(sessionID);
        if (!state) {
            state = { promptFailureCount: 0 };
            sessions.set(sessionID, state);
        }
        return state;
    }
    const upstreamEventHandler = createAtlasEventHandler({ ctx, options, sessions, getState });
    const boulderGatingHandler = createBoulderGatingWrapper({
        ctx,
        handler: upstreamEventHandler,
    });
    const wrappedEventHandler = createContinuationMaxRetriesWrapper({
        handler: boulderGatingHandler,
        getState,
    });
    return {
        handler: wrappedEventHandler,
        "tool.execute.before": createToolExecuteBeforeHandler({ ctx, pendingFilePaths }),
        "tool.execute.after": createToolExecuteAfterHandler({ ctx, pendingFilePaths, autoCommit }),
    };
}
