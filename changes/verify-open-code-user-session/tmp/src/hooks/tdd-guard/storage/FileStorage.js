import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { TRANSIENT_DATA } from './Storage';
/**
 * Default file names for each data type.
 */
const FILE_NAMES = {
    test: 'test-results.txt',
    todo: 'todos.txt',
    modifications: 'modifications.txt',
    lint: 'lint-results.txt',
    config: 'config.json',
    instructions: 'instructions.md',
};
/**
 * File-based storage implementation for TDD Guard.
 * Persists data to the file system for cross-session persistence.
 */
export class FileStorage {
    dataDir;
    filePaths;
    constructor(options) {
        this.dataDir = options.dataDir;
        this.filePaths = {
            test: join(this.dataDir, FILE_NAMES.test),
            todo: join(this.dataDir, FILE_NAMES.todo),
            modifications: join(this.dataDir, FILE_NAMES.modifications),
            lint: join(this.dataDir, FILE_NAMES.lint),
            config: join(this.dataDir, FILE_NAMES.config),
            instructions: join(this.dataDir, FILE_NAMES.instructions),
        };
    }
    /**
     * Creates a FileStorage instance with default data directory.
     */
    static create(projectRoot) {
        return new FileStorage({
            dataDir: join(projectRoot, '.tdd-guard'),
        });
    }
    async ensureDirectory() {
        await mkdir(this.dataDir, { recursive: true });
    }
    async save(type, content) {
        await this.ensureDirectory();
        await writeFile(this.filePaths[type], content, 'utf-8');
    }
    async get(type) {
        try {
            return await readFile(this.filePaths[type], 'utf-8');
        }
        catch {
            return null;
        }
    }
    async saveTest(content) {
        await this.save('test', content);
    }
    async saveTodo(content) {
        await this.save('todo', content);
    }
    async saveModifications(content) {
        await this.save('modifications', content);
    }
    async saveLint(content) {
        await this.save('lint', content);
    }
    async saveConfig(content) {
        await this.save('config', content);
    }
    async saveInstructions(content) {
        await this.save('instructions', content);
    }
    async getTest() {
        return this.get('test');
    }
    async getTodo() {
        return this.get('todo');
    }
    async getModifications() {
        return this.get('modifications');
    }
    async getLint() {
        return this.get('lint');
    }
    async getConfig() {
        return this.get('config');
    }
    async getInstructions() {
        return this.get('instructions');
    }
    async clearTransientData() {
        await Promise.all(TRANSIENT_DATA.map((fileType) => this.deleteFileIfExists(this.filePaths[fileType])));
    }
    async deleteFileIfExists(filePath) {
        try {
            await unlink(filePath);
        }
        catch (error) {
            // Only ignore ENOENT errors (file not found)
            if (error instanceof Error &&
                'code' in error &&
                error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
}
