import { getTranscriptPath as getDefaultTranscriptPath } from "../claude-code-hooks/transcript";
import { createLoopSessionRecovery } from "./loop-session-recovery";
import { createLoopStateController } from "./loop-state-controller";
import { createRalphLoopEventHandler } from "./ralph-loop-event-handler";
const DEFAULT_API_TIMEOUT = 5000;
function getMessageCountFromResponse(messagesResponse) {
    if (Array.isArray(messagesResponse)) {
        return messagesResponse.length;
    }
    if (typeof messagesResponse === "object" && messagesResponse !== null && "data" in messagesResponse) {
        const data = messagesResponse.data;
        return Array.isArray(data) ? data.length : 0;
    }
    return 0;
}
export function createRalphLoopHook(ctx, options) {
    const config = options?.config;
    const stateDir = config?.state_dir;
    const getTranscriptPath = options?.getTranscriptPath ?? getDefaultTranscriptPath;
    const apiTimeout = options?.apiTimeout ?? DEFAULT_API_TIMEOUT;
    const checkSessionExists = options?.checkSessionExists;
    const loopState = createLoopStateController({
        directory: ctx.directory,
        stateDir,
        config,
    });
    const sessionRecovery = createLoopSessionRecovery();
    const event = createRalphLoopEventHandler(ctx, {
        directory: ctx.directory,
        apiTimeoutMs: apiTimeout,
        getTranscriptPath,
        checkSessionExists,
        sessionRecovery,
        loopState,
    });
    return {
        event,
        startLoop: (sessionID, prompt, loopOptions) => {
            const startSuccess = loopState.startLoop(sessionID, prompt, loopOptions);
            if (!startSuccess || typeof loopOptions?.messageCountAtStart === "number") {
                return startSuccess;
            }
            ctx.client.session
                .messages({
                path: { id: sessionID },
                query: { directory: ctx.directory },
            })
                .then((messagesResponse) => {
                const messageCountAtStart = getMessageCountFromResponse(messagesResponse);
                loopState.setMessageCountAtStart(sessionID, messageCountAtStart);
            })
                .catch(() => { });
            return startSuccess;
        },
        cancelLoop: loopState.cancelLoop,
        getState: loopState.getState,
    };
}
