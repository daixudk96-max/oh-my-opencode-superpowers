// TDD-EXEMPT: reason="Expanding Bash creation patterns to cover all planning file names"
// Patterns for planning files that require skill("creating-changes") first
export const TASKS_MD_PATTERN = 'changes/*/tasks.md';
export const PLAN_MD_PATTERN = 'changes/*/plan.md';
// Broader patterns to catch renamed planning files
export const PLANNING_FILE_PATTERNS = [
    'changes/*/tasks.md',
    'changes/*/plan.md',
    'changes/*/plans.md',
    'changes/*/task.md',
    'changes/*/todo.md',
    'changes/*/todos.md',
    'changes/*/checklist.md',
    'changes/*/implementation.md',
    'changes/*/impl.md',
    'changes/*/work.md',
    'changes/*/workplan.md',
    'changes/*/work-plan.md',
    'changes/*/roadmap.md',
    'changes/*/breakdown.md',
    'changes/*/steps.md',
];
export const ERROR_MESSAGE = `BLOCKED: Must invoke skill("creating-changes") first.

Renaming the file will NOT bypass this check.`;
export const INTERCEPTED_TOOLS = ['Write', 'Edit', 'MultiEdit', 'Bash'];
// Bash command patterns that create files
const PLANNING_FILE_NAME_PATTERN = `(?:tasks|plan|plans|task|todo|todos|checklist|implementation|impl|work|workplan|work-plan|roadmap|breakdown|steps)\\.md`;
// TDD-EXEMPT: reason="Simplifying Bash creation patterns for better matching"
export const BASH_FILE_CREATION_PATTERNS = [
    new RegExp(`[>|]\\s*["']?([^"\'\\s|&;]+${PLANNING_FILE_NAME_PATTERN})["']?`, "i"),
    new RegExp(`\\b(?:cat|tee|touch|cp|mv|echo)\\s+.*?["']?([^"\'\\s|&;]+${PLANNING_FILE_NAME_PATTERN})["']?`, "i"),
];
