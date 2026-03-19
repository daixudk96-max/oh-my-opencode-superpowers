export const PROMPT_TIMEOUT_MS = 120000;
export function createPromptTimeoutContext(args, timeoutMs) {
    const timeoutController = new AbortController();
    let timeoutID = null;
    let timedOut = false;
    const abortOnUpstreamSignal = () => {
        timeoutController.abort(args.signal?.reason);
    };
    if (args.signal) {
        if (args.signal.aborted) {
            timeoutController.abort(args.signal.reason);
        }
        else {
            args.signal.addEventListener("abort", abortOnUpstreamSignal, { once: true });
        }
    }
    timeoutID = setTimeout(() => {
        timedOut = true;
        timeoutController.abort(new Error(`prompt timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    return {
        signal: timeoutController.signal,
        wasTimedOut: () => timedOut,
        cleanup: () => {
            if (timeoutID !== null) {
                clearTimeout(timeoutID);
            }
            if (args.signal) {
                args.signal.removeEventListener("abort", abortOnUpstreamSignal);
            }
        },
    };
}
