import { createPrometheusMdOnlyHook } from "./src/hooks/prometheus-md-only";

// Provide a mock context to satisfy the hook signature
const mockCtx = {
  directory: process.cwd(),
  client: {},
  agent: { key: "prometheus" }
} as any;

// Mock the getAgentFromSession dependency instead of the full hook
import * as sessionUtils from "./src/shared/session-utils";
(sessionUtils as any).getAgentFromSession = async () => "prometheus";

async function test() {
  const hook = createPrometheusMdOnlyHook(mockCtx);
  
  const input: any = { tool: "write", sessionID: "test-session", callID: "test-call" };
  const output: any = { args: { filePath: "C:/tmp/test.ts" } };
  
  try {
     await hook["tool.execute.before"]?.(input, output);
     console.log("No error thrown, blocked field if any:", output.blocked);
  } catch(e) {
     console.log("Blocked:", e);
  }
}

test();
