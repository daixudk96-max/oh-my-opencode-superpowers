import { log } from "../../shared/logger";
import { readConnectedProvidersCache, readProviderModelsCache } from "../../shared/connected-providers-cache";
function addFromProviderModels(out, providerID, models) {
    if (!models)
        return;
    for (const item of models) {
        const modelID = typeof item === "string" ? item : item?.id;
        if (!modelID)
            continue;
        out.add(`${providerID}/${modelID}`);
    }
}
export async function getAvailableModelsForDelegateTask(client) {
    const providerModelsCache = readProviderModelsCache();
    if (providerModelsCache?.models) {
        const connected = new Set(providerModelsCache.connected);
        const out = new Set();
        for (const [providerID, models] of Object.entries(providerModelsCache.models)) {
            if (!connected.has(providerID))
                continue;
            addFromProviderModels(out, providerID, models);
        }
        return out;
    }
    const connectedProviders = readConnectedProvidersCache();
    if (!connectedProviders || connectedProviders.length === 0) {
        return new Set();
    }
    const modelList = client
        ?.model
        ?.list;
    if (!modelList) {
        return new Set();
    }
    try {
        const result = await modelList();
        const rows = Array.isArray(result)
            ? result
            : result.data ?? [];
        const connected = new Set(connectedProviders);
        const out = new Set();
        for (const row of rows) {
            if (!row?.provider || !row?.id)
                continue;
            if (!connected.has(row.provider))
                continue;
            out.add(`${row.provider}/${row.id}`);
        }
        return out;
    }
    catch (err) {
        log("[delegate-task] client.model.list failed", { error: String(err) });
        return new Set();
    }
}
