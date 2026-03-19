import { z } from "zod";
export const McpNameSchema = z.enum(["websearch", "context7", "grep_app"]);
export const AnyMcpNameSchema = z.string().min(1);
