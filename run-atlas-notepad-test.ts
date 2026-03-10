import { createSisyphusJuniorNotepadHook } from "./src/hooks/sisyphus-junior-notepad";

async function test() {
  const hook = createSisyphusJuniorNotepadHook();
  const input: any = { 
    toolName: "task", 
    input: { subagent_type: "Sisyphus-Junior", prompt: "Hello Sisyphus" } 
  };
  const ctx: any = { agent: { isOrchestrator: true } }; // check isOrchestrator flag
  
  await hook["tool.execute.before"]?.(ctx, input);
  console.log("Modified Prompt starts with directive:", input.input.prompt.includes("NOTEPAD"));
  console.log("Modified Prompt:\n", input.input.prompt.substring(0, 200) + "...");
}

test();
