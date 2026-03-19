import { log } from "../../../shared/logger";
export async function showUpdateAvailableToast(ctx, latestVersion, getToastMessage) {
    await ctx.client.tui
        .showToast({
        body: {
            title: `OhMyOpenCode ${latestVersion}`,
            message: getToastMessage(true, latestVersion),
            variant: "info",
            duration: 8000,
        },
    })
        .catch(() => { });
    log(`[auto-update-checker] Update available toast shown: v${latestVersion}`);
}
export async function showAutoUpdatedToast(ctx, oldVersion, newVersion) {
    await ctx.client.tui
        .showToast({
        body: {
            title: "OhMyOpenCode Updated!",
            message: `v${oldVersion} → v${newVersion}\nRestart OpenCode to apply.`,
            variant: "success",
            duration: 8000,
        },
    })
        .catch(() => { });
    log(`[auto-update-checker] Auto-updated toast shown: v${oldVersion} → v${newVersion}`);
}
