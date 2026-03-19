import { createAnthropicContextWindowLimitRecoveryHook } from "../../../hooks/anthropic-context-window-limit-recovery";
export const manifest = {
    name: "anthropic-context-window-limit-recovery",
    lifecycle: ["event"],
    factory: createAnthropicContextWindowLimitRecoveryHook,
};
