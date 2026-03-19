/**
 * Agent Chains
 *
 * Predefined agent collaboration sequences for common workflows (Bugfix/Refactor)
 */
/**
 * Chain type enumeration
 */
export var ChainType;
(function (ChainType) {
    ChainType["BUGFIX"] = "bugfix";
    ChainType["REFACTOR"] = "refactor";
})(ChainType || (ChainType = {}));
/**
 * Predefined chains
 */
const CHAINS = {
    [ChainType.BUGFIX]: {
        type: ChainType.BUGFIX,
        name: "Bugfix Chain",
        description: "Systematic bug diagnosis and fix workflow",
        steps: [
            {
                agent: "explore",
                purpose: "Locate relevant code and understand the codebase structure",
                tools: ["grep", "glob", "ast_grep_search", "lsp_find_references"],
            },
            {
                agent: "oracle",
                purpose: "Diagnose the root cause and propose fix strategy",
                tools: ["read", "lsp_diagnostics"],
            },
            {
                agent: "hephaestus",
                purpose: "Implement the fix following TDD principles",
                tools: ["write", "edit", "bash"],
            },
            {
                agent: "verifier",
                purpose: "Verify the fix works and no regressions introduced",
                tools: ["bash", "lsp_diagnostics"],
            },
        ],
    },
    [ChainType.REFACTOR]: {
        type: ChainType.REFACTOR,
        name: "Refactor Chain",
        description: "Safe code refactoring with LSP-assisted transformations",
        steps: [
            {
                agent: "explore",
                purpose: "Locate all usages and understand impact scope",
                tools: ["grep", "lsp_find_references", "ast_grep_search"],
            },
            {
                agent: "oracle",
                purpose: "Analyze refactoring strategy and identify risks",
                tools: ["read", "lsp_diagnostics"],
            },
            {
                agent: "hephaestus",
                purpose: "Execute refactoring using LSP tools for safe renames",
                tools: ["lsp", "lsp_rename", "edit", "ast_grep_replace"],
            },
            {
                agent: "verifier",
                purpose: "Verify all tests pass and no type errors introduced",
                tools: ["bash", "lsp_diagnostics"],
            },
        ],
    },
};
/**
 * Agent Chain Manager implementation
 */
class AgentChainManagerImpl {
    hasChain(type) {
        return type in CHAINS;
    }
    getChain(type) {
        if (!this.hasChain(type)) {
            const available = this.listChains().join(", ");
            throw new Error(`Unknown chain type: "${type}". Available chains: ${available}`);
        }
        return {
            ...CHAINS[type],
            steps: [...CHAINS[type].steps],
        };
    }
    getChainWithCustomSteps(type, customSteps) {
        const chain = this.getChain(type);
        return {
            ...chain,
            steps: [...chain.steps, ...customSteps],
        };
    }
    getChainWithSkippedSteps(type, skipAgents) {
        const chain = this.getChain(type);
        return {
            ...chain,
            steps: chain.steps.filter((step) => !skipAgents.includes(step.agent)),
        };
    }
    listChains() {
        return Object.values(ChainType);
    }
    generateExecutionContext(type, input) {
        const chain = this.getChain(type);
        const lines = [];
        lines.push(`## ${chain.name} Execution Plan`);
        lines.push("");
        if (input.issue) {
            lines.push(`**Issue**: ${input.issue}`);
        }
        if (input.files && input.files.length > 0) {
            lines.push(`**Target Files**: ${input.files.join(", ")}`);
        }
        if (input.description) {
            lines.push(`**Description**: ${input.description}`);
        }
        lines.push("");
        lines.push("### Execution Steps");
        lines.push("");
        for (let i = 0; i < chain.steps.length; i++) {
            const step = chain.steps[i];
            lines.push(`${i + 1}. **${step.agent}**: ${step.purpose}`);
            lines.push(`   - Tools: ${step.tools.join(", ")}`);
        }
        return lines.join("\n");
    }
}
/**
 * Create a new Agent Chain Manager instance
 */
export function createAgentChainManager() {
    return new AgentChainManagerImpl();
}
