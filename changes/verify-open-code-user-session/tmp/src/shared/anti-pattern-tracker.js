import { existsSync, writeFileSync, readFileSync } from "node:fs";
export class AntiPatternTracker {
    storagePath;
    patterns = new Map();
    constructor(storagePath) {
        this.storagePath = storagePath;
        this.load();
    }
    trackFailure(pattern, reason) {
        const existing = this.patterns.get(pattern);
        if (existing) {
            existing.count += 1;
            existing.timestamp = Date.now();
            existing.reason = reason;
        }
        else {
            this.patterns.set(pattern, {
                pattern,
                reason,
                timestamp: Date.now(),
                count: 1,
            });
        }
        this.save();
    }
    getFailedPatterns() {
        return Array.from(this.patterns.values());
    }
    isKnownFailure(pattern) {
        return this.patterns.has(pattern);
    }
    clear() {
        this.patterns.clear();
        this.save();
    }
    load() {
        if (!this.storagePath || !existsSync(this.storagePath)) {
            return;
        }
        try {
            const content = readFileSync(this.storagePath, "utf-8");
            const data = JSON.parse(content);
            for (const entry of data) {
                this.patterns.set(entry.pattern, entry);
            }
        }
        catch {
            // Invalid file, start fresh
        }
    }
    save() {
        if (!this.storagePath) {
            return;
        }
        const data = Array.from(this.patterns.values());
        writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    }
}
