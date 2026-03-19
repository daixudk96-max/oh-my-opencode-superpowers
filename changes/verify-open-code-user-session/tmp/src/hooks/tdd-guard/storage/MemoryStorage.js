import { TRANSIENT_DATA } from './Storage';
/**
 * In-memory storage implementation for TDD Guard.
 * Useful for testing and ephemeral sessions.
 */
export class MemoryStorage {
    store = new Map();
    async saveTest(content) {
        this.store.set('test', content);
    }
    async saveTodo(content) {
        this.store.set('todo', content);
    }
    async saveModifications(content) {
        this.store.set('modifications', content);
    }
    async saveLint(content) {
        this.store.set('lint', content);
    }
    async saveConfig(content) {
        this.store.set('config', content);
    }
    async saveInstructions(content) {
        this.store.set('instructions', content);
    }
    async getTest() {
        return this.store.get('test') ?? null;
    }
    async getTodo() {
        return this.store.get('todo') ?? null;
    }
    async getModifications() {
        return this.store.get('modifications') ?? null;
    }
    async getLint() {
        return this.store.get('lint') ?? null;
    }
    async getConfig() {
        return this.store.get('config') ?? null;
    }
    async getInstructions() {
        return this.store.get('instructions') ?? null;
    }
    async clearTransientData() {
        for (const key of TRANSIENT_DATA) {
            this.store.delete(key);
        }
    }
}
