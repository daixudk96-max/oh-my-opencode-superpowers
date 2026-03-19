import { createAnthropicEffortHook } from "../../../hooks/anthropic-effort";
export const manifest = {
    name: "anthropic-effort",
    lifecycle: ["chat.params"],
    factory: createAnthropicEffortHook,
};
