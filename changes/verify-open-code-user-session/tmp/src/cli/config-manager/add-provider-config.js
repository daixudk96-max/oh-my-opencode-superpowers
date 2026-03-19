import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { getConfigDir } from "./config-context";
import { ensureConfigDirectoryExists } from "./ensure-config-directory-exists";
import { formatErrorWithSuggestion } from "./format-error-with-suggestion";
import { detectConfigFormat } from "./opencode-config-format";
import { parseOpenCodeConfigFileWithError } from "./parse-opencode-config-file";
import { ANTIGRAVITY_PROVIDER_CONFIG } from "./antigravity-provider-configuration";
import { modifyProviderInJsonc } from "./jsonc-provider-editor";
import { parseJsonc } from "../../shared/jsonc-parser";
export function addProviderConfig(config) {
    try {
        ensureConfigDirectoryExists();
    }
    catch (err) {
        return {
            success: false,
            configPath: getConfigDir(),
            error: formatErrorWithSuggestion(err, "create config directory"),
        };
    }
    const { format, path } = detectConfigFormat();
    try {
        let existingConfig = null;
        if (format !== "none") {
            const parseResult = parseOpenCodeConfigFileWithError(path);
            if (parseResult.error && !parseResult.config) {
                return {
                    success: false,
                    configPath: path,
                    error: `Failed to parse config file: ${parseResult.error}`,
                };
            }
            existingConfig = parseResult.config;
        }
        const newConfig = { ...(existingConfig ?? {}) };
        const providers = (newConfig.provider ?? {});
        if (config.hasGemini) {
            providers.google = ANTIGRAVITY_PROVIDER_CONFIG.google;
        }
        if (Object.keys(providers).length > 0) {
            newConfig.provider = providers;
        }
        if (format === "jsonc") {
            const content = readFileSync(path, "utf-8");
            // Backup original file
            copyFileSync(path, `${path}.bak`);
            const providerValue = (newConfig.provider ?? {});
            const newContent = modifyProviderInJsonc(content, providerValue);
            // Post-write validation
            try {
                parseJsonc(newContent);
            }
            catch (error) {
                return {
                    success: false,
                    configPath: path,
                    error: `Generated JSONC is invalid: ${error instanceof Error ? error.message : String(error)}`,
                };
            }
            writeFileSync(path, newContent);
        }
        else {
            writeFileSync(path, JSON.stringify(newConfig, null, 2) + "\n");
        }
        return { success: true, configPath: path };
    }
    catch (err) {
        return {
            success: false,
            configPath: path,
            error: formatErrorWithSuggestion(err, "add provider config"),
        };
    }
}
