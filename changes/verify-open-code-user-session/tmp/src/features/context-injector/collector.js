import { DEFAULT_SOURCE_ORDER } from "./types";
import { scoreRelevance, } from "../../shared/relevance-scorer";
const PRIORITY_ORDER = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
};
const CONTEXT_SEPARATOR = "\n\n---\n\n";
function normalizeIntentMode(mode) {
    if (typeof mode !== "string")
        return "default";
    const normalized = mode.toLowerCase();
    if (normalized === "review" || normalized === "research" || normalized === "debug") {
        return normalized;
    }
    if (normalized === "implement" || normalized === "implementation" || normalized === "dev") {
        return "implement";
    }
    return "default";
}
function scoreEntryRelevance(entry) {
    const metadata = entry.metadata ?? {};
    const resourcePath = (typeof metadata.resourcePath === "string" && metadata.resourcePath) ||
        (typeof metadata.filePath === "string" && metadata.filePath) ||
        (typeof metadata.path === "string" && metadata.path);
    if (!resourcePath) {
        return scoreRelevance({ path: entry.id }, "default");
    }
    const resource = {
        path: resourcePath,
        type: typeof metadata.resourceType === "string" ? metadata.resourceType : undefined,
    };
    const intent = normalizeIntentMode(metadata.intentMode);
    return scoreRelevance(resource, intent);
}
/**
 * Build source order map from array for O(1) lookups
 */
function buildSourceOrderMap(sourceOrder) {
    const map = new Map();
    sourceOrder.forEach((source, index) => {
        map.set(source, index);
    });
    return map;
}
let registrationCounter = 0;
export class ContextCollector {
    sessions = new Map();
    sourceOrderMap;
    constructor(options) {
        const sourceOrder = options?.sourceOrder ?? DEFAULT_SOURCE_ORDER;
        this.sourceOrderMap = buildSourceOrderMap(sourceOrder);
    }
    register(sessionID, options) {
        if (!this.sessions.has(sessionID)) {
            this.sessions.set(sessionID, new Map());
        }
        const sessionMap = this.sessions.get(sessionID);
        if (!sessionMap)
            return;
        const key = options.source + ":" + options.id;
        const entry = {
            id: options.id,
            source: options.source,
            content: options.content,
            priority: options.priority ?? "normal",
            registrationOrder: ++registrationCounter,
            metadata: options.metadata,
        };
        sessionMap.set(key, entry);
    }
    getPending(sessionID) {
        const sessionMap = this.sessions.get(sessionID);
        if (!sessionMap || sessionMap.size === 0) {
            return {
                merged: "",
                entries: [],
                hasContent: false,
            };
        }
        const entries = this.sortEntries([...sessionMap.values()]);
        const merged = entries.map((e) => e.content).join(CONTEXT_SEPARATOR);
        return {
            merged,
            entries,
            hasContent: entries.length > 0,
        };
    }
    consume(sessionID) {
        const pending = this.getPending(sessionID);
        this.clear(sessionID);
        return pending;
    }
    clear(sessionID) {
        this.sessions.delete(sessionID);
    }
    hasPending(sessionID) {
        const sessionMap = this.sessions.get(sessionID);
        return sessionMap !== undefined && sessionMap.size > 0;
    }
    sortEntries(entries) {
        return entries.sort((a, b) => {
            // First: sort by source order (for cache-friendly injection)
            const sourceOrderA = this.sourceOrderMap.get(a.source) ?? 999;
            const sourceOrderB = this.sourceOrderMap.get(b.source) ?? 999;
            if (sourceOrderA !== sourceOrderB)
                return sourceOrderA - sourceOrderB;
            // Second: sort by priority within same source
            const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            // Third: sort by relevance score within same source and priority
            const relevanceDiff = scoreEntryRelevance(b) - scoreEntryRelevance(a);
            if (relevanceDiff !== 0)
                return relevanceDiff;
            // Fourth: preserve registration order within same priority/relevance
            return a.registrationOrder - b.registrationOrder;
        });
    }
}
export const contextCollector = new ContextCollector();
