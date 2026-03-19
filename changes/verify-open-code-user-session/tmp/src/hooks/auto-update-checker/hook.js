import { log } from "../../shared/logger";
import { getCachedVersion, getLocalDevVersion } from "./checker";
import { runBackgroundUpdateCheck } from "./hook/background-update-check";
import { showConfigErrorsIfAny } from "./hook/config-errors-toast";
import { updateAndShowConnectedProvidersCacheStatus } from "./hook/connected-providers-status";
import { showModelCacheWarningIfNeeded } from "./hook/model-cache-warning";
import { showLocalDevToast, showVersionToast } from "./hook/startup-toasts";
export function createAutoUpdateCheckerHook(ctx, options = {}) {
    const { showStartupToast = true, isSisyphusEnabled = false, autoUpdate = true } = options;
    const isCliRunMode = process.env.OPENCODE_CLI_RUN_MODE === "true";
    const getToastMessage = (isUpdate, latestVersion) => {
        if (isSisyphusEnabled) {
            return isUpdate
                ? `Sisyphus on steroids is steering OpenCode.\nv${latestVersion} available. Restart to apply.`
                : "Sisyphus on steroids is steering OpenCode.";
        }
        return isUpdate
            ? `OpenCode is now on Steroids. oMoMoMoMo...\nv${latestVersion} available. Restart OpenCode to apply.`
            : "OpenCode is now on Steroids. oMoMoMoMo...";
    };
    let hasChecked = false;
    return {
        event: ({ event }) => {
            if (event.type !== "session.created")
                return;
            if (isCliRunMode)
                return;
            if (hasChecked)
                return;
            const props = event.properties;
            if (props?.info?.parentID)
                return;
            hasChecked = true;
            setTimeout(async () => {
                const cachedVersion = getCachedVersion();
                const localDevVersion = getLocalDevVersion(ctx.directory);
                const displayVersion = localDevVersion ?? cachedVersion;
                await showConfigErrorsIfAny(ctx);
                await updateAndShowConnectedProvidersCacheStatus(ctx);
                await showModelCacheWarningIfNeeded(ctx);
                if (localDevVersion) {
                    if (showStartupToast) {
                        showLocalDevToast(ctx, displayVersion, isSisyphusEnabled).catch(() => { });
                    }
                    log("[auto-update-checker] Local development mode");
                    return;
                }
                if (showStartupToast) {
                    showVersionToast(ctx, displayVersion, getToastMessage(false)).catch(() => { });
                }
                runBackgroundUpdateCheck(ctx, autoUpdate, getToastMessage).catch((err) => {
                    log("[auto-update-checker] Background update check failed:", err);
                });
            }, 0);
        },
    };
}
