import yaml from "js-yaml";
export function parseFrontmatter(content) {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n?---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    if (!match) {
        return { data: {}, body: content, hadFrontmatter: false, parseError: false };
    }
    const yamlContent = match[1];
    const body = match[2];
    try {
        // Use JSON_SCHEMA for security - prevents code execution via YAML tags
        const parsed = yaml.load(yamlContent, { schema: yaml.JSON_SCHEMA });
        const data = (parsed ?? {});
        return { data, body, hadFrontmatter: true, parseError: false };
    }
    catch {
        return { data: {}, body, hadFrontmatter: true, parseError: true };
    }
}
