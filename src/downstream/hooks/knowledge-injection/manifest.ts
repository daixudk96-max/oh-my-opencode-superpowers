import { createKnowledgeInjectionHook } from "../../../hooks/knowledge-injection"
import type { HookManifest } from "../../types"

export const manifest: HookManifest = {
  name: "knowledge-injection",
  lifecycle: ["tool.execute.before"],
  factory: createKnowledgeInjectionHook,
}
