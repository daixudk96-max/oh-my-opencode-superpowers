import { createTddGuardHook } from "./src/hooks/tdd-guard";

async function test() {
  const hook = createTddGuardHook({ cwd: process.cwd() });
  const output: any = { parts: [{ type: "text", text: "/tdd on" }] };
  await hook["chat.message"]?.({ sessionID: "test" } as any, output);
  console.log("Blocked:", output.blocked);
  console.log("Message parts:", JSON.stringify(output.parts, null, 2));
}

test();
