import { platform } from "os";
import { getOsascriptPath, getNotifySendPath, getPowershellPath, getAfplayPath, getPaplayPath, getAplayPath, getTerminalNotifierPath, } from "./session-notification-utils";
import { buildWindowsToastScript, escapeAppleScriptText, escapePowerShellSingleQuotedText } from "./session-notification-formatting";
export function detectPlatform() {
    const detected = platform();
    if (detected === "darwin" || detected === "linux" || detected === "win32")
        return detected;
    return "unsupported";
}
export function getDefaultSoundPath(platform) {
    switch (platform) {
        case "darwin":
            return "/System/Library/Sounds/Glass.aiff";
        case "linux":
            return "/usr/share/sounds/freedesktop/stereo/complete.oga";
        case "win32":
            return "C:\\Windows\\Media\\notify.wav";
        default:
            return "";
    }
}
export async function sendSessionNotification(ctx, platform, title, message) {
    switch (platform) {
        case "darwin": {
            // Try terminal-notifier first — deterministic click-to-focus
            const terminalNotifierPath = await getTerminalNotifierPath();
            if (terminalNotifierPath) {
                const bundleId = process.env.__CFBundleIdentifier;
                try {
                    if (bundleId) {
                        await ctx.$ `${terminalNotifierPath} -title ${title} -message ${message} -activate ${bundleId}`;
                    }
                    else {
                        await ctx.$ `${terminalNotifierPath} -title ${title} -message ${message}`;
                    }
                    break;
                }
                catch {
                }
            }
            // Fallback: osascript (click may open Finder instead of terminal)
            const osascriptPath = await getOsascriptPath();
            if (!osascriptPath)
                return;
            const escapedTitle = escapeAppleScriptText(title);
            const escapedMessage = escapeAppleScriptText(message);
            await ctx.$ `${osascriptPath} -e ${"display notification \"" + escapedMessage + "\" with title \"" + escapedTitle + "\""}`.catch(() => { });
            break;
        }
        case "linux": {
            const notifySendPath = await getNotifySendPath();
            if (!notifySendPath)
                return;
            await ctx.$ `${notifySendPath} ${title} ${message} 2>/dev/null`.catch(() => { });
            break;
        }
        case "win32": {
            const powershellPath = await getPowershellPath();
            if (!powershellPath)
                return;
            const toastScript = buildWindowsToastScript(title, message);
            await ctx.$ `${powershellPath} -Command ${toastScript}`.catch(() => { });
            break;
        }
    }
}
export async function playSessionNotificationSound(ctx, platform, soundPath) {
    switch (platform) {
        case "darwin": {
            const afplayPath = await getAfplayPath();
            if (!afplayPath)
                return;
            ctx.$ `${afplayPath} ${soundPath}`.catch(() => { });
            break;
        }
        case "linux": {
            const paplayPath = await getPaplayPath();
            if (paplayPath) {
                ctx.$ `${paplayPath} ${soundPath} 2>/dev/null`.catch(() => { });
            }
            else {
                const aplayPath = await getAplayPath();
                if (aplayPath) {
                    ctx.$ `${aplayPath} ${soundPath} 2>/dev/null`.catch(() => { });
                }
            }
            break;
        }
        case "win32": {
            const powershellPath = await getPowershellPath();
            if (!powershellPath)
                return;
            const escaped = escapePowerShellSingleQuotedText(soundPath);
            ctx.$ `${powershellPath} -Command ${("(New-Object Media.SoundPlayer '" + escaped + "').PlaySync()")}`.catch(() => { });
            break;
        }
    }
}
