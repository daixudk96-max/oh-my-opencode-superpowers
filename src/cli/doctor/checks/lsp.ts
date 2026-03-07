import type { CheckResult, CheckDefinition, LspServerInfo } from "../types"
import { isServerInstalled } from "../../../tools/lsp/config"
import { LSP_INSTALL_HINTS } from "../../../tools/lsp/constants"

const LSP_CHECK_ID = "lsp-servers"
const LSP_CHECK_NAME = "LSP Servers"

const DEFAULT_LSP_SERVERS: Array<{
  id: string
  binary: string
  extensions: string[]
}> = [
  { id: "typescript-language-server", binary: "typescript-language-server", extensions: [".ts", ".tsx", ".js", ".jsx"] },
  { id: "pyright", binary: "pyright-langserver", extensions: [".py"] },
  { id: "rust-analyzer", binary: "rust-analyzer", extensions: [".rs"] },
  { id: "gopls", binary: "gopls", extensions: [".go"] },
]

export async function getLspServersInfo(): Promise<LspServerInfo[]> {
  return DEFAULT_LSP_SERVERS.map((server) => ({
    id: server.id,
    installed: isServerInstalled([server.binary]),
    extensions: server.extensions,
    source: "builtin",
  }))
}

export function getLspServerStats(servers: LspServerInfo[]): { installed: number; total: number } {
  const installed = servers.filter((server) => server.installed).length
  return { installed, total: servers.length }
}

function buildMissingServerDetails(servers: LspServerInfo[]): string[] {
  return servers.map((server) => {
    const hint = LSP_INSTALL_HINTS[server.id] || LSP_INSTALL_HINTS[server.id.split("-")[0]]
    return `Missing: ${server.id}${hint ? `\nHint: ${hint}` : ""}`
  })
}

export async function checkLspServers(): Promise<CheckResult> {
  const servers = await getLspServersInfo()
  const stats = getLspServerStats(servers)
  const installedServers = servers.filter((server) => server.installed)
  const missingServers = servers.filter((server) => !server.installed)

  if (stats.installed === 0) {
    return {
      name: LSP_CHECK_NAME,
      status: "warn",
      message: "No LSP servers detected",
      details: [
        "LSP tools will have limited functionality",
        ...buildMissingServerDetails(missingServers),
      ],
      issues: [
        {
          title: "No LSP servers detected",
          description: "LSP-dependent tools will have limited functionality.",
          severity: "warning",
          affects: ["lsp diagnostics", "rename", "references"],
        },
      ],
    }
  }

  const details = [
    ...installedServers.map((server) => `Installed: ${server.id}`),
    ...missingServers.map((server) => {
      const hint = LSP_INSTALL_HINTS[server.id] || LSP_INSTALL_HINTS[server.id.split("-")[0]]
      return `Not found: ${server.id} (optional)${hint ? `\nHint: ${hint}` : ""}`
    }),
  ]

  const issues: CheckResult["issues"] =
    missingServers.length === 0
      ? []
      : [
          {
            title: "Some LSP servers are missing",
            description: `${missingServers.length} optional LSP server(s) are not installed.`,
            severity: "warning",
            affects: ["language-specific diagnostics"],
          },
        ]

  return {
    name: LSP_CHECK_NAME,
    status: missingServers.length === 0 ? "pass" : "warn",
    message: `${stats.installed}/${stats.total} servers available`,
    details,
    issues,
  }
}

export function getLspCheckDefinition(): CheckDefinition {
  return {
    id: LSP_CHECK_ID,
    name: LSP_CHECK_NAME,
    category: "tools",
    check: checkLspServers,
    critical: false,
  }
}
