import { join } from "path";
import { homedir } from "os";
import { getClaudeConfigDir } from "../../shared/claude-config-dir";
import { getOpenCodeConfigDir } from "../../shared/opencode-config-dir";
import { skillsToCommandDefinitionRecord } from "./skill-definition-record";
import { deduplicateSkillsByName } from "./skill-deduplication";
import { loadSkillsFromDir } from "./skill-directory-loader";
export async function loadUserSkills() {
    const userSkillsDir = join(getClaudeConfigDir(), "skills");
    const skills = await loadSkillsFromDir({ skillsDir: userSkillsDir, scope: "user" });
    return skillsToCommandDefinitionRecord(skills);
}
export async function loadProjectSkills(directory) {
    const projectSkillsDir = join(directory ?? process.cwd(), ".claude", "skills");
    const skills = await loadSkillsFromDir({ skillsDir: projectSkillsDir, scope: "project" });
    return skillsToCommandDefinitionRecord(skills);
}
export async function loadOpencodeGlobalSkills() {
    const configDir = getOpenCodeConfigDir({ binary: "opencode" });
    const opencodeSkillsDir = join(configDir, "skills");
    const skills = await loadSkillsFromDir({ skillsDir: opencodeSkillsDir, scope: "opencode" });
    return skillsToCommandDefinitionRecord(skills);
}
export async function loadOpencodeProjectSkills(directory) {
    const opencodeProjectDir = join(directory ?? process.cwd(), ".opencode", "skills");
    const skills = await loadSkillsFromDir({ skillsDir: opencodeProjectDir, scope: "opencode-project" });
    return skillsToCommandDefinitionRecord(skills);
}
export async function discoverAllSkills(directory) {
    const [opencodeProjectSkills, opencodeGlobalSkills, projectSkills, userSkills, agentsProjectSkills, agentsGlobalSkills] = await Promise.all([
        discoverOpencodeProjectSkills(directory),
        discoverOpencodeGlobalSkills(),
        discoverProjectClaudeSkills(directory),
        discoverUserClaudeSkills(),
        discoverProjectAgentsSkills(directory),
        discoverGlobalAgentsSkills(),
    ]);
    // Priority: opencode-project > opencode > project (.claude + .agents) > user (.claude + .agents)
    return deduplicateSkillsByName([
        ...opencodeProjectSkills,
        ...opencodeGlobalSkills,
        ...projectSkills,
        ...agentsProjectSkills,
        ...userSkills,
        ...agentsGlobalSkills,
    ]);
}
export async function discoverSkills(options = {}) {
    const { includeClaudeCodePaths = true, directory } = options;
    const [opencodeProjectSkills, opencodeGlobalSkills] = await Promise.all([
        discoverOpencodeProjectSkills(directory),
        discoverOpencodeGlobalSkills(),
    ]);
    if (!includeClaudeCodePaths) {
        // Priority: opencode-project > opencode
        return deduplicateSkillsByName([...opencodeProjectSkills, ...opencodeGlobalSkills]);
    }
    const [projectSkills, userSkills, agentsProjectSkills, agentsGlobalSkills] = await Promise.all([
        discoverProjectClaudeSkills(directory),
        discoverUserClaudeSkills(),
        discoverProjectAgentsSkills(directory),
        discoverGlobalAgentsSkills(),
    ]);
    // Priority: opencode-project > opencode > project (.claude + .agents) > user (.claude + .agents)
    return deduplicateSkillsByName([
        ...opencodeProjectSkills,
        ...opencodeGlobalSkills,
        ...projectSkills,
        ...agentsProjectSkills,
        ...userSkills,
        ...agentsGlobalSkills,
    ]);
}
export async function getSkillByName(name, options = {}) {
    const skills = await discoverSkills(options);
    return skills.find(s => s.name === name);
}
export async function discoverUserClaudeSkills() {
    const userSkillsDir = join(getClaudeConfigDir(), "skills");
    return loadSkillsFromDir({ skillsDir: userSkillsDir, scope: "user" });
}
export async function discoverProjectClaudeSkills(directory) {
    const projectSkillsDir = join(directory ?? process.cwd(), ".claude", "skills");
    return loadSkillsFromDir({ skillsDir: projectSkillsDir, scope: "project" });
}
export async function discoverOpencodeGlobalSkills() {
    const configDir = getOpenCodeConfigDir({ binary: "opencode" });
    const opencodeSkillsDir = join(configDir, "skills");
    return loadSkillsFromDir({ skillsDir: opencodeSkillsDir, scope: "opencode" });
}
export async function discoverOpencodeProjectSkills(directory) {
    const opencodeProjectDir = join(directory ?? process.cwd(), ".opencode", "skills");
    return loadSkillsFromDir({ skillsDir: opencodeProjectDir, scope: "opencode-project" });
}
export async function discoverProjectAgentsSkills(directory) {
    const agentsProjectDir = join(directory ?? process.cwd(), ".agents", "skills");
    return loadSkillsFromDir({ skillsDir: agentsProjectDir, scope: "project" });
}
export async function discoverGlobalAgentsSkills() {
    const agentsGlobalDir = join(homedir(), ".agents", "skills");
    return loadSkillsFromDir({ skillsDir: agentsGlobalDir, scope: "user" });
}
