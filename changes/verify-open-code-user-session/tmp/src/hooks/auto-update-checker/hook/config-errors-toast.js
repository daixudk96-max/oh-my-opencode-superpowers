import { getConfigLoadErrors, clearConfigLoadErrors } from "../../../shared/config-errors";
import { log } from "../../../shared/logger";
export async function showConfigErrorsIfAny(ctx) {
    const errors = getConfigLoadErrors();
    if (errors.length === 0)
        return;
    const errorMessages = errors.map((error) => `${error.path}: ${error.error}`).join("\n");
    await ctx.client.tui
        .showToast({
        body: {
            title: "Config Load Error",
            message: `Failed to load config:\n${errorMessages}`,
            variant: "error",
            duration: 10000,
        },
    })
        .catch(() => { });
    log(`[auto-update-checker] Config load errors shown: ${errors.length} error(s)`);
    clearConfigLoadErrors();
}
