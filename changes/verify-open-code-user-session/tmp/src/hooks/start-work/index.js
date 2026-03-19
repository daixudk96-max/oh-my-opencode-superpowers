// TDD-EXEMPT: reason="Path migration to changes/"
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createStartWorkHook as createStartWorkHookUpstream } from "./start-work-hook";
import { LEGACY_PROMETHEUS_PLANS_DIR } from "../../features/boulder-state"; // TDD-EXEMPT: path migration fix
const ARGUMENT_PLACEHOLDER = "$ARGUMENTS";
const USER_MESSAGE_PLACEHOLDER = "$" + "{user_message}";
const PRIMARY_PLANS_DIR = "changes";
const TASKS_FILE = "tasks.md";
export { parseUserRequest } from "./parse-user-request";
export { HOOK_NAME } from "./start-work-hook";
export { detectWorktreePath } from "./worktree-detector";
function sanitizeArgumentPlaceholders(text) {
    return text
        .replaceAll(ARGUMENT_PLACEHOLDER, "")
        .replaceAll(USER_MESSAGE_PLACEHOLDER, "");
}
function sanitizeTextParts(output) {
    output.parts = output.parts.map((part) => {
        if (part.type !== "text" || !part.text) {
            return part;
        }
        return {
            ...part,
            text: sanitizeArgumentPlaceholders(part.text),
        };
    });
}
function readMessagePathDirectory(message) {
    if (!message || typeof message !== "object") {
        return {};
    }
    const maybePath = message.path;
    if (!maybePath || typeof maybePath !== "object") {
        return {};
    }
    const cwd = maybePath.cwd;
    const root = maybePath.root;
    return {
        cwd: typeof cwd === "string" ? cwd : undefined,
        root: typeof root === "string" ? root : undefined,
    };
}
function resolveWorkingDirectory(defaultDirectory, output) {
    const { cwd, root } = readMessagePathDirectory(output.message);
    if (cwd && existsSync(cwd)) {
        return cwd;
    }
    if (root && existsSync(root)) {
        return root;
    }
    return defaultDirectory;
}
function listLegacyPlanTasks(directory) {
    const legacyPlansDir = join(directory, PRIMARY_PLANS_DIR); // TDD-EXEMPT: path migration fix
    if (!existsSync(legacyPlansDir)) {
        return [];
    }
    try {
        return readdirSync(legacyPlansDir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => join(legacyPlansDir, entry.name, TASKS_FILE))
            .filter((planPath) => existsSync(planPath))
            .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    }
    catch {
        return [];
    }
}
function hasPrometheusPlans(directory) {
    const plansDir = join(directory, LEGACY_PROMETHEUS_PLANS_DIR); // TDD-EXEMPT: path migration fix
    if (!existsSync(plansDir)) {
        return false;
    }
    try {
        return readdirSync(plansDir).some((fileName) => fileName.endsWith(".md"));
    }
    catch {
        return false;
    }
}
function ensureLegacyPlanMirror(directory) {
    if (hasPrometheusPlans(directory)) {
        return;
    }
    const legacyPlanTasks = listLegacyPlanTasks(directory);
    if (legacyPlanTasks.length === 0) {
        return;
    }
    try {
        const plansDir = join(directory, LEGACY_PROMETHEUS_PLANS_DIR); // TDD-EXEMPT: path migration fix
        if (!existsSync(plansDir)) {
            mkdirSync(plansDir, { recursive: true });
        }
        for (const legacyPlanPath of legacyPlanTasks) {
            const planName = basename(dirname(legacyPlanPath));
            const mirroredPlanPath = join(plansDir, `${planName}.md`);
            const planContent = readFileSync(legacyPlanPath, "utf-8");
            writeFileSync(mirroredPlanPath, planContent, "utf-8");
        }
    }
    catch {
        return;
    }
}
export function createStartWorkHook(ctx) {
    return {
        "chat.message": async (input, output) => {
            sanitizeTextParts(output);
            const workingDirectory = resolveWorkingDirectory(ctx.directory, output);
            ensureLegacyPlanMirror(workingDirectory);
            const upstreamHook = createStartWorkHookUpstream({
                ...ctx,
                directory: workingDirectory,
            });
            await upstreamHook["chat.message"](input, output);
            sanitizeTextParts(output);
        },
    };
}
