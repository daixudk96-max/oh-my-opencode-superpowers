import fsModule from "fs";
import fs from "fs";
import path from "path";
import ts from "typescript";
import { fileURLToPath } from "url";

const moduleCache = new Map();

export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    if (context.parentURL) {
      try {
        const parentUrl = new URL(context.parentURL);
        const candidateBase = new URL(specifier.endsWith("/") ? specifier : specifier + "/", parentUrl);
        const candidatePath = fileURLToPath(candidateBase);
        if (fsModule.existsSync(candidatePath) && fsModule.statSync(candidatePath).isDirectory()) {
          const indexUrl = new URL("./index.ts", candidateBase);
          return await defaultResolve(indexUrl.href, context, defaultResolve);
        }
      } catch {
        // ignore and continue
      }
      try {
        const parentUrl = new URL(context.parentURL);
        const candidateFile = new URL(specifier + ".ts", parentUrl);
        const candidatePath = fileURLToPath(candidateFile);
        if (fsModule.existsSync(candidatePath)) {
          return await defaultResolve(candidateFile.href, context, defaultResolve);
        }
      } catch {
        // ignore and rethrow original
      }
    }
    throw error;
  }
}

export async function load(url, context, defaultLoad) {
  if (url.startsWith("bun:")) {
    return {
      format: "module",
      source: `export const bunStub = {}; export default bunStub; export const file = bunStub; export const fetch = bunStub;`,
      shortCircuit: true,
    };
  }
  if (url.includes("/downstream/runtime-hook-executor.ts")) {
    return {
      format: "module",
      source: `
const fallbackSpy = {
  runChatMessage: async () => {},
  runToolExecuteBefore: async () => {},
  runToolExecuteAfter: async () => {},
  runUserPromptSubmit: async () => {},
  runEvent: async () => {},
  runExperimentalSessionCompacting: async () => {},
};

const spy = globalThis.__downstreamSpy || fallbackSpy;

export async function bootstrapDownstreamHooks() {
  return spy;
}
      `.trim(),
      shortCircuit: true,
    };
  }

  if (
    url.includes("/features/builtin-skills/skills.ts") ||
    url.includes("/features/builtin-skills/index.ts") ||
    url.includes("/features/builtin-skills/skills/")
  ) {
    return {
      format: "module",
      source: `export function createBuiltinSkills() { return []; }`,
      shortCircuit: true,
    };
  }

  if (url.includes("/node_modules/@opencode-ai/plugin/dist/index.js")) {
    return {
      format: "module",
      source: `export const Plugin = {}; export default Plugin;`,
      shortCircuit: true,
    };
  }

  if (url.includes("/node_modules/@opencode-ai/plugin/dist/tool")) {
    return {
      format: "module",
      source: `export const tool = {}; export default tool;`,
      shortCircuit: true,
    };
  }

  if (!url.endsWith(".ts") && !url.endsWith(".mts")) {
    return defaultLoad(url, context, defaultLoad);
  }

  if (moduleCache.has(url)) {
    return moduleCache.get(url);
  }

  const source = await fsModule.promises.readFile(new URL(url), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
      allowImportingTsExtensions: true,
    },
    fileName: path.basename(url),
  });

  const result = {
    format: "module",
    source: transpiled.outputText,
    shortCircuit: true,
  };

  moduleCache.set(url, result);
  return result;
}
