/**
 * PostToolLintHandler for TDD Guard lint-after-edit
 *
 * Handles PostToolUse event for Write/Edit tools.
 * When TDD Guard is enabled, appends lint reminder to tool output.
 */
const TDD_ENABLED_KEY = 'tdd_guard_enabled';
/**
 * Handles PostToolUse events for Write/Edit tools.
 * When TDD Guard is enabled, reminds the agent to run linting.
 */
export class PostToolLintHandler {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Process a PostToolUse event for lint reminders.
     *
     * @param hookData JSON string containing PostToolUse event data
     */
    async processPostToolUse(hookData) {
        // #given a PostToolUse event
        // #when processing the event
        // #then check if it's a Write/Edit tool and TDD Guard is enabled
        let parsedData;
        try {
            parsedData = JSON.parse(hookData);
        }
        catch {
            return { handled: false }; // Invalid JSON, ignore
        }
        if (!this.isPostToolUseData(parsedData)) {
            return { handled: false }; // Not a PostToolUse event
        }
        // Only process Write and Edit tools
        const toolName = parsedData.tool_name.toLowerCase();
        if (toolName !== 'write' && toolName !== 'edit') {
            return { handled: false };
        }
        // Check if TDD Guard is enabled
        const enabled = await this.isEnabled();
        if (!enabled) {
            return { handled: false };
        }
        // Extract file path from tool input
        const filePath = this.extractFilePath(parsedData);
        if (!filePath) {
            return { handled: false };
        }
        // #given TDD Guard is enabled and a file was modified
        // #when the tool completes successfully
        // #then append lint reminder to output
        return {
            handled: true,
            appendMessage: this.createLintReminder(filePath),
        };
    }
    /**
     * Check if TDD Guard is currently enabled.
     */
    async isEnabled() {
        const config = await this.storage.getConfig();
        if (!config) {
            return true; // Default: enabled
        }
        try {
            const parsed = JSON.parse(config);
            return parsed[TDD_ENABLED_KEY] !== false;
        }
        catch {
            return true; // Default: enabled on parse error
        }
    }
    /**
     * Extract file path from PostToolUse data.
     */
    extractFilePath(data) {
        const toolInput = data.tool_input;
        if (!toolInput) {
            return null;
        }
        return toolInput.file_path ?? toolInput.filePath ?? toolInput.path ?? null;
    }
    /**
     * Create a lint reminder message for the given file.
     */
    createLintReminder(filePath) {
        return `
[TDD Guard - Lint Reminder]
File modified: ${filePath}

Consider running linting/type-checking to catch issues early:
- TypeScript: \`bun run typecheck\` or \`tsc --noEmit\`
- ESLint: \`eslint ${filePath}\`
- Tests: \`bun test\` (if tests exist for this file)
`;
    }
    /**
     * Type guard for PostToolUseData
     */
    isPostToolUseData(data) {
        if (typeof data !== 'object' || data === null) {
            return false;
        }
        const obj = data;
        return (obj.hook_event_name === 'PostToolUse' &&
            typeof obj.tool_name === 'string');
    }
}
