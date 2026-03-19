import { existsSync, writeFileSync, readFileSync } from "node:fs";
export class KnowledgeExtractor {
    storagePath;
    constructor(storagePath) {
        this.storagePath = storagePath;
    }
    async extract(issue) {
        const pattern = issue.description.toLowerCase();
        const solution = issue.fix;
        return {
            id: crypto.randomUUID(),
            pattern,
            solution,
            timestamp: Date.now()
        };
    }
    async extractAndSave(issue) {
        const entry = await this.extract(issue);
        const knowledge = this.load();
        knowledge.push(entry);
        this.save(knowledge);
    }
    async compress(limit) {
        const knowledge = this.load();
        if (knowledge.length <= limit)
            return;
        // Keep the latest entries based on timestamp
        const compressed = knowledge
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-limit);
        this.save(compressed);
    }
    async cleanup(maxAgeMs) {
        const now = Date.now();
        const knowledge = this.load();
        const filtered = knowledge.filter(entry => (now - entry.timestamp) <= maxAgeMs);
        this.save(filtered);
    }
    load() {
        if (!existsSync(this.storagePath)) {
            return [];
        }
        try {
            const content = readFileSync(this.storagePath, "utf-8");
            return JSON.parse(content);
        }
        catch {
            return [];
        }
    }
    save(knowledge) {
        writeFileSync(this.storagePath, JSON.stringify(knowledge, null, 2));
    }
}
