import { createSkillAutoInjectorHook } from "./src/hooks/skill-auto-injector";

async function test() {
  const hook = createSkillAutoInjectorHook();
  const ctx = { log: console.log, cwd: process.cwd() };
  hook.init?.(ctx as any);
  const output: any = { parts: [{ type: "text", text: "I need to write a failing test first using the red-green-refactor TDD approach for my new authentication module." }] };
  
  // Try to bypass ctx if needed
  try {
     await hook["chat.message"]?.({ sessionID: "test" } as any, output);
  } catch (e) {
     console.log(e);
  }
}

test();
