import { getOpenCodeConfigPaths } from "../../shared";
let configContext = null;
export function initConfigContext(binary, version) {
    const paths = getOpenCodeConfigPaths({ binary, version });
    configContext = { binary, version, paths };
}
export function getConfigContext() {
    if (!configContext) {
        const paths = getOpenCodeConfigPaths({ binary: "opencode", version: null });
        configContext = { binary: "opencode", version: null, paths };
    }
    return configContext;
}
export function resetConfigContext() {
    configContext = null;
}
export function getConfigDir() {
    return getConfigContext().paths.configDir;
}
export function getConfigJson() {
    return getConfigContext().paths.configJson;
}
export function getConfigJsonc() {
    return getConfigContext().paths.configJsonc;
}
export function getOmoConfigPath() {
    return getConfigContext().paths.omoConfig;
}
