import { execSync } from "node:child_process"

/**
 * Commit Size Checker
 *
 * Enforces atomic commits by warning when a commit includes too many files.
 * Default threshold is 3 files per commit.
 */

/**
 * Commit check input
 */
export interface CommitCheckInput {
  files: string[]
  skipCheck?: boolean
}

/**
 * Commit check result
 */
export interface CommitCheckResult {
  shouldWarn: boolean
  skipped: boolean
  message?: string
  fileCount: number
}

/**
 * Default file count threshold
 */
const DEFAULT_THRESHOLD = 3
const COMMIT_BLOCK_THRESHOLD = 10

/**
 * Commit Size Checker interface
 */
export interface CommitSizeChecker {
  /** Check if commit exceeds file threshold */
  check(input: CommitCheckInput): CommitCheckResult
  /** Set custom threshold */
  setThreshold(threshold: number): void
  /** Get current threshold */
  getThreshold(): number
  /** Check if command is a git commit */
  isCommitCommand(command: string): boolean
  /** Get staged files in current repository */
  getStagedFiles(cwd: string): string[]
  /** Tool execute before hook */
  "tool.execute.before"?(
    input: { tool?: string },
    output: {
      args?: { command?: string; cwd?: string }
      blocked?: boolean
      message?: string
    }
  ): Promise<void> | void
}

/**
 * Commit Size Checker implementation
 */
class CommitSizeCheckerImpl implements CommitSizeChecker {
  private threshold: number = DEFAULT_THRESHOLD

  check(input: CommitCheckInput): CommitCheckResult {
    const fileCount = input.files.length

    // Skip if requested
    if (input.skipCheck) {
      return {
        shouldWarn: false,
        skipped: true,
        fileCount,
      }
    }

    // Check against threshold
    if (fileCount > this.threshold) {
      return {
        shouldWarn: true,
        skipped: false,
        fileCount,
        message: this.generateWarningMessage(fileCount),
      }
    }

    return {
      shouldWarn: false,
      skipped: false,
      fileCount,
    }
  }

  private generateWarningMessage(fileCount: number): string {
    return `⚠️ 提交包含 ${fileCount} 个文件，超过建议阈值 (${this.threshold})。

建议将此次提交分拆为多个原子化提交，每个提交聚焦于单一功能或修改。

原子化提交的好处：
- 更容易进行代码审查
- 更容易回滚特定变更
- 更清晰的 git 历史

如需跳过此检查，可添加 --no-verify 标志。`
  }

  setThreshold(threshold: number): void {
    this.threshold = threshold
  }

  getThreshold(): number {
    return this.threshold
  }

  isCommitCommand(command: string): boolean {
    // TDD-EXEMPT: Regex fix
    // Match git commit with various flags, allowing prefix environments
    const commitPattern = /(?:^|[;&|]\s*)git\s+commit\b/i
    return commitPattern.test(command.trim())
  }

  getStagedFiles(cwd: string): string[] {
    try {
      const output = execSync("git diff --cached --name-only", {
        cwd,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      })
      return output
        .split(/\r?\n/)
        .map((file) => file.trim())
        .filter((file) => file.length > 0)
    } catch {
      return []
    }
  }

  // Add the hook interface method
  "tool.execute.before"(
    input: { tool?: string },
    output: {
      args?: { command?: string; cwd?: string }
      blocked?: boolean
      message?: string
    }
  ): void {
    if (input.tool !== "bash") return
    const args = output.args ?? {}
    if (!args.command || !this.isCommitCommand(args.command)) return

    const files = this.getStagedFiles(args.cwd ?? process.cwd())

    if (files.length > COMMIT_BLOCK_THRESHOLD) {
      output.blocked = true
      output.message = `Commit blocked: ${files.length} files staged (threshold: ${COMMIT_BLOCK_THRESHOLD}). Split your commit.`
      return
    }

    const result = this.check({ files })

    if (result.shouldWarn) {
      output.blocked = true
      output.message = result.message
    }
  }
}

/**
 * Create a new Commit Size Checker instance
 */
export function createCommitSizeChecker(): CommitSizeChecker {
  return new CommitSizeCheckerImpl()
}
