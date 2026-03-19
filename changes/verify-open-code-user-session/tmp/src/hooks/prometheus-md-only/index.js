import { createPrometheusMdOnlyHook as createPrometheusMdOnlyHookUpstream } from "./hook";
export * from "./constants";
export function createPrometheusMdOnlyHook(ctx) {
    const upstreamHook = createPrometheusMdOnlyHookUpstream(ctx);
    const upstreamToolExecuteBefore = upstreamHook["tool.execute.before"];
    return {
        ...upstreamHook,
        "tool.execute.before": async (input, output) => {
            if (input.tool === "delegate_task") {
                return upstreamToolExecuteBefore({ ...input, tool: "task" }, output);
            }
            return upstreamToolExecuteBefore(input, output);
        },
    };
}
