export function buildWaveBranchName(featureName, waveId) {
    return `feature/${featureName}-wave${waveId}`;
}
export function groupTasksIntoWaves(tasks, options = {}) {
    const normalizedTasks = tasks.map(normalizeTask);
    const taskById = new Map(normalizedTasks.map((task) => [task.id, task]));
    const conflicts = [];
    for (const [taskId, task] of taskById) {
        if (taskId !== task.id) {
            throw new Error(`Task id mismatch: ${taskId} != ${task.id}`);
        }
    }
    const fileToTasks = new Map();
    for (const task of normalizedTasks) {
        const files = new Set([...task.files.create, ...task.files.modify]);
        for (const file of files) {
            const taskIds = fileToTasks.get(file) ?? [];
            taskIds.push(task.id);
            fileToTasks.set(file, taskIds);
        }
    }
    for (const [file, taskIds] of fileToTasks) {
        if (taskIds.length <= 1) {
            continue;
        }
        for (let index = 1; index < taskIds.length; index += 1) {
            const blockingTaskId = taskIds[index - 1];
            const blockedTaskId = taskIds[index];
            const blockedTask = taskById.get(blockedTaskId);
            if (!blockedTask) {
                continue;
            }
            if (!blockedTask.dependsOn.includes(blockingTaskId)) {
                blockedTask.dependsOn.push(blockingTaskId);
            }
            const conflict = { file, blockingTaskId, blockedTaskId };
            conflicts.push(conflict);
            options.onConflict?.(conflict);
        }
    }
    const completed = new Set();
    const remaining = [...normalizedTasks];
    const waves = [];
    let waveId = 0;
    while (remaining.length > 0) {
        const ready = remaining.filter((task) => task.dependsOn.every((dependency) => completed.has(dependency)));
        if (ready.length === 0) {
            throw new Error("Circular or unresolved dependency detected");
        }
        const wave = {
            id: waveId,
            tasks: ready,
            worktreeBranch: options.featureName
                ? buildWaveBranchName(options.featureName, waveId)
                : undefined,
        };
        waves.push(wave);
        const readyIds = new Set(ready.map((task) => task.id));
        for (const task of ready) {
            completed.add(task.id);
        }
        for (let index = remaining.length - 1; index >= 0; index -= 1) {
            if (readyIds.has(remaining[index].id)) {
                remaining.splice(index, 1);
            }
        }
        waveId += 1;
    }
    return { waves, conflicts };
}
function normalizeTask(task) {
    return {
        id: task.id,
        dependsOn: [...new Set(task.dependsOn ?? [])],
        files: {
            create: task.files?.create ?? [],
            modify: task.files?.modify ?? [],
            test: task.files?.test ?? [],
        },
    };
}
