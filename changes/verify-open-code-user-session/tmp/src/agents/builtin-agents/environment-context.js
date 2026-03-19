import { createEnvContext } from "../env-context";
export function applyEnvironmentContext(config, directory, options = {}) {
    if (options.disableOmoEnv || !directory || !config.prompt)
        return config;
    const envContext = createEnvContext();
    return { ...config, prompt: config.prompt + envContext };
}
