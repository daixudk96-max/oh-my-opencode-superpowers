import { describe, expect, test } from "bun:test"
import { mcpHealthChecker } from "../../mcp"
import { McpStatus } from "../../mcp/health-checker"
import { createBuiltinMcpsWithStartupHealthCheck } from "./mcp-startup-health-check"

describe("createBuiltinMcpsWithStartupHealthCheck", () => {
  test("returns built-in MCP map and runs async startup health checks", async () => {
    //#given
    mcpHealthChecker.setMockHealth("context7", false, "test-down")

    //#when
    const mcps = createBuiltinMcpsWithStartupHealthCheck([])
    await new Promise((resolve) => setTimeout(resolve, 20))

    //#then
    expect(mcps).toHaveProperty("websearch")
    expect(mcps).toHaveProperty("context7")
    expect(mcps).toHaveProperty("grep_app")
    expect(mcpHealthChecker.getStatus("context7")).toBe(McpStatus.DEGRADED)
  })
})
