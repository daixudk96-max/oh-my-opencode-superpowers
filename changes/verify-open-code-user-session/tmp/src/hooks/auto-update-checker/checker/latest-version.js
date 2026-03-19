import { NPM_FETCH_TIMEOUT, NPM_REGISTRY_URL } from "../constants";
export async function getLatestVersion(channel = "latest") {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NPM_FETCH_TIMEOUT);
    try {
        const response = await fetch(NPM_REGISTRY_URL, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
        });
        if (!response.ok)
            return null;
        const data = (await response.json());
        return data[channel] ?? data.latest ?? null;
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
