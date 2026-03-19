async function findCommand(commandName) {
    try {
        return Bun.which(commandName);
    }
    catch {
        return null;
    }
}
function createCommandFinder(commandName) {
    let cachedPath = null;
    let pending = null;
    return async () => {
        if (cachedPath !== null)
            return cachedPath;
        if (pending)
            return pending;
        pending = (async () => {
            const path = await findCommand(commandName);
            cachedPath = path;
            return path;
        })();
        return pending;
    };
}
export const getNotifySendPath = createCommandFinder("notify-send");
export const getOsascriptPath = createCommandFinder("osascript");
export const getPowershellPath = createCommandFinder("powershell");
export const getAfplayPath = createCommandFinder("afplay");
export const getPaplayPath = createCommandFinder("paplay");
export const getAplayPath = createCommandFinder("aplay");
export const getTerminalNotifierPath = createCommandFinder("terminal-notifier");
export function startBackgroundCheck(platform) {
    if (platform === "darwin") {
        getOsascriptPath().catch(() => { });
        getAfplayPath().catch(() => { });
        getTerminalNotifierPath().catch(() => { });
    }
    else if (platform === "linux") {
        getNotifySendPath().catch(() => { });
        getPaplayPath().catch(() => { });
        getAplayPath().catch(() => { });
    }
    else if (platform === "win32") {
        getPowershellPath().catch(() => { });
    }
}
