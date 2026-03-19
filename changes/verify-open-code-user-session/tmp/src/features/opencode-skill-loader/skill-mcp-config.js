import { promises as fs } from "fs";
import { join } from "path";
import yaml from "js-yaml";
export function parseSkillMcpConfigFromFrontmatter(content) {
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch)
        return undefined;
    try {
        const parsed = yaml.load(frontmatterMatch[1]);
        if (parsed && typeof parsed === "object" && "mcp" in parsed && parsed.mcp) {
            return parsed.mcp;
        }
    }
    catch {
        return undefined;
    }
    return undefined;
}
export async function loadMcpJsonFromDir(skillDir) {
    const mcpJsonPath = join(skillDir, "mcp.json");
    try {
        const content = await fs.readFile(mcpJsonPath, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object" && "mcpServers" in parsed && parsed.mcpServers) {
            return parsed.mcpServers;
        }
        if (parsed && typeof parsed === "object" && !("mcpServers" in parsed)) {
            const hasCommandField = Object.values(parsed).some((value) => value && typeof value === "object" && "command" in value);
            if (hasCommandField) {
                return parsed;
            }
        }
    }
    catch {
        return undefined;
    }
    return undefined;
}
