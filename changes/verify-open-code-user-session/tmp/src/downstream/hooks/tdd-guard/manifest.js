import { createTddGuardHook } from "../../../hooks/tdd-guard";
export const manifest = {
    name: "tdd-guard",
    lifecycle: ["chat.message", "tool.execute.before", "tool.execute.after", "event"],
    factory: createTddGuardHook,
};
