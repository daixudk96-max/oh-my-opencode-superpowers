let configLoadErrors = [];
export function getConfigLoadErrors() {
    return configLoadErrors;
}
export function clearConfigLoadErrors() {
    configLoadErrors = [];
}
export function addConfigLoadError(error) {
    configLoadErrors.push(error);
}
