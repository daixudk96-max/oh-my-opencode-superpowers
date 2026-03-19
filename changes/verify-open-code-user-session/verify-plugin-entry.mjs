const scriptDir = new URL("./", import.meta.url);

const callLog = [];

const downstreamCounts = {
  before: 0,
  after: 0,
  userPrompt: 0,
};

const createSpyHook = (hook) => {
  return async (...args) => {
    downstreamCounts[hook] += 1;
    callLog.push({ hook, args });
  };
};

globalThis.__downstreamSpy = {
  runChatMessage: async () => {},
  runToolExecuteBefore: createSpyHook("before"),
  runToolExecuteAfter: createSpyHook("after"),
  runUserPromptSubmit: createSpyHook("userPrompt"),
  runEvent: async () => {},
  runExperimentalSessionCompacting: async () => {},
};

const pluginModule = await import(new URL("../../src/index.ts", scriptDir).href);

const pluginFactory = pluginModule.default;

if (typeof pluginFactory !== "function") {
  throw new Error("Plugin factory not exported as default");
}

const ctx = {
  directory: process.cwd(),
  client: {},
};

const pluginInterface = await pluginFactory(ctx);

const toolInput = {
  tool: "Edit",
  sessionID: "verify-plugin-session",
  args: [],
};

const toolOutput = {
  args: [],
  blocked: false,
};

await pluginInterface["tool.execute.before"]?.(toolInput, toolOutput);
await pluginInterface["tool.execute.after"]?.(toolInput, {
  ...toolOutput,
  blocked: false,
});

await pluginInterface.UserPromptSubmit?.(
  { prompt: "verify downstream hooks" },
  { blocked: false },
);

if (downstreamCounts.before !== 1) {
  throw new Error("downstreamHooks.runToolExecuteBefore was not triggered exactly once");
}

if (downstreamCounts.after !== 1) {
  throw new Error("downstreamHooks.runToolExecuteAfter was not triggered exactly once");
}

if (downstreamCounts.userPrompt !== 1) {
  throw new Error("downstreamHooks.runUserPromptSubmit was not triggered exactly once");
}

console.log("Downstream counts", downstreamCounts);
console.log("Call log", callLog);
console.log("Verified plugin lifecycle wrappers delegate to downstream hooks.");
