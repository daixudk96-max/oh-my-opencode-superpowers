import { createCommitSizeCheckerWrapper } from "../../patches/commit-size-checker-wrapper";
export const manifest = {
    name: "commit-size-checker",
    lifecycle: ["tool.execute.before"],
    factory: createCommitSizeCheckerWrapper,
};
