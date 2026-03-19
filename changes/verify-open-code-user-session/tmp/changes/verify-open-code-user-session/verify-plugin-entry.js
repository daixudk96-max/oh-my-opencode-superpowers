import pluginFactory from "../../src/index";
const counts = { before: 0, after: 0, userPrompt: 0 };
const metadataLog = [];
const downstreamStub = {
    parseHookName: () => null,
    runChatMessage: async () => { },
    runEvent: async () => { },
    runExperimentalSessionCompacting: async () => { },
    runToolExecuteBefore: async (input) => {
        const typed = input;
        metadataLog.push(`[downstream] runToolExecuteBefore tool=${typed.tool ?? "<unknown>"} session=${typed.sessionID ?? "<unknown>"}`);
        counts.before += 1;
    },
    runToolExecuteAfter: async (input) => {
        const typed = input;
        metadataLog.push(`[downstream] runToolExecuteAfter tool=${typed.tool ?? "<unknown>"} session=${typed.sessionID ?? "<unknown>"}`);
        counts.after += 1;
    },
    runUserPromptSubmit: async (input) => {
        const typed = input;
        metadataLog.push(`[downstream] runUserPromptSubmit prompt=${JSON.stringify(typed.prompt)} session=${typed.sessionID ?? "<unknown>"}`);
        counts.userPrompt += 1;
    },
};
globalThis.__ohMyOpenCodeDownstreamHooksOverride = async () => downstreamStub;
const pluginInput = {
    directory: process.cwd(),
    client: {},
    project: {},
    worktree: process.cwd(),
    serverUrl: new URL("http://localhost"),
    $: {},
};
async function runVerification() {
    const pluginInterface = await pluginFactory(pluginInput);
    const toolPayload = {
        tool: "verify-tool",
        sessionID: "verify-session",
        callID: "verify-call",
    };
    const toolArgs = { foo: "bar" };
    await pluginInterface["tool.execute.before"]?.(toolPayload, { args: toolArgs });
    await pluginInterface["tool.execute.after"]?.(toolPayload, { title: "ok", output: "result", metadata: { ok: true } });
    await pluginInterface.UserPromptSubmit?.({ prompt: "/verify-hooks", sessionID: toolPayload.sessionID }, { blocked: false });
    if (counts.before !== 1 || counts.after !== 1 || counts.userPrompt !== 1) {
        throw new Error(`Expected each downstream hook once (before=${counts.before}, after=${counts.after}, userPrompt=${counts.userPrompt})`);
    }
    console.log(`Sample metadata: tool=${toolPayload.tool}, session=${toolPayload.sessionID}, args=${JSON.stringify(toolArgs)}`);
    metadataLog.forEach((entry) => console.log(entry));
    const summaryLine = `[verify] Summary: downstream spies saw tool.execute.before=${counts.before}, tool.execute.after=${counts.after}, UserPromptSubmit=${counts.userPrompt}`;
    console.log(summaryLine);
    console.log("Verified plugin wrappers; downstream hooks triggered");
}
runVerification().catch((error) => {
    console.error("Verification failed", error);
    process.exitCode = 1;
});
