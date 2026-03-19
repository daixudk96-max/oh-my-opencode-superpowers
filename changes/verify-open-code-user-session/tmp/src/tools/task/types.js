import { z } from "zod";
export const TaskStatusSchema = z.enum(["pending", "in_progress", "completed", "deleted"]);
export const TaskObjectSchema = z
    .object({
    id: z.string(),
    subject: z.string(),
    description: z.string(),
    status: TaskStatusSchema,
    activeForm: z.string().optional(),
    blocks: z.array(z.string()).default([]),
    blockedBy: z.array(z.string()).default([]),
    owner: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    repoURL: z.string().optional(),
    parentID: z.string().optional(),
    threadID: z.string(),
})
    .strict();
// Claude Code style aliases
export const TaskSchema = TaskObjectSchema;
// Action input schemas
export const TaskCreateInputSchema = z.object({
    subject: z.string(),
    description: z.string().optional(),
    activeForm: z.string().optional(),
    blocks: z.array(z.string()).optional(),
    blockedBy: z.array(z.string()).optional(),
    owner: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    repoURL: z.string().optional(),
    parentID: z.string().optional(),
});
export const TaskListInputSchema = z.object({
    status: TaskStatusSchema.optional(),
    parentID: z.string().optional(),
});
export const TaskGetInputSchema = z.object({
    id: z.string(),
});
export const TaskUpdateInputSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    description: z.string().optional(),
    status: TaskStatusSchema.optional(),
    activeForm: z.string().optional(),
    addBlocks: z.array(z.string()).optional(),
    addBlockedBy: z.array(z.string()).optional(),
    owner: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    repoURL: z.string().optional(),
    parentID: z.string().optional(),
});
export const TaskDeleteInputSchema = z.object({
    id: z.string(),
});
