import { createTextPart } from "../../shared/part-factory";
import { ProjectDetector } from "../../shared/project-detector";
export function createProjectContextInjectorHook(ctx) {
    const injectedSessions = new Set();
    let cachedProjectInfo = null;
    const getProjectInfo = async () => {
        if (cachedProjectInfo) {
            return cachedProjectInfo;
        }
        const detector = new ProjectDetector(ctx.directory);
        cachedProjectInfo = await detector.detect();
        return cachedProjectInfo;
    };
    const formatProjectContext = (info) => {
        const lines = [
            "[PROJECT CONTEXT]",
            `Package Manager: ${info.packageManager}`,
            `Frameworks: ${info.frameworks.length > 0 ? info.frameworks.join(", ") : "none detected"}`,
            `Code Style: ESLint=${info.codeStyle.eslint}, Prettier=${info.codeStyle.prettier}`,
        ];
        return lines.join("\n");
    };
    return {
        "chat.message": async (input, output) => {
            if (injectedSessions.has(input.sessionID)) {
                return;
            }
            injectedSessions.add(input.sessionID);
            const projectInfo = await getProjectInfo();
            const contextText = formatProjectContext(projectInfo);
            if (!output.parts) {
                output.parts = [];
            }
            output.parts.push(createTextPart({
                sessionID: input.sessionID,
                messageID: input.messageID,
                text: contextText,
            }));
        },
    };
}
