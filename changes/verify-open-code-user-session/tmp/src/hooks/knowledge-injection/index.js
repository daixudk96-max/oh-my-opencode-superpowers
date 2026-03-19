import { existsSync, readFileSync } from "node:fs";
const DEFAULT_STORAGE_PATH = ".opencode/knowledge.json";
export function createKnowledgeInjectionHook(config) {
    const storagePath = config?.storagePath ?? DEFAULT_STORAGE_PATH;
    const loadKnowledge = () => {
        if (!existsSync(storagePath)) {
            return [];
        }
        try {
            const content = readFileSync(storagePath, "utf-8");
            return JSON.parse(content);
        }
        catch {
            return [];
        }
    };
    return {
        "tool.execute.before": async (_input, _output) => {
            const knowledge = loadKnowledge();
            if (knowledge.length === 0) {
                return;
            }
            // Knowledge is loaded and available for injection
            // Future: Match patterns against tool context and inject relevant solutions
        },
    };
}
