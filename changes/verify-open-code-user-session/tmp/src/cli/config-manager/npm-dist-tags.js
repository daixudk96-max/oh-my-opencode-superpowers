const NPM_FETCH_TIMEOUT_MS = 5000;
export async function fetchNpmDistTags(packageName) {
    try {
        const res = await fetch(`https://registry.npmjs.org/-/package/${encodeURIComponent(packageName)}/dist-tags`, {
            signal: AbortSignal.timeout(NPM_FETCH_TIMEOUT_MS),
        });
        if (!res.ok)
            return null;
        const data = (await res.json());
        return data;
    }
    catch {
        return null;
    }
}
