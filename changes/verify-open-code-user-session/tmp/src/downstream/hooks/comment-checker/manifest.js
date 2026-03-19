import { createCommentCheckerHooks } from "../../../hooks/comment-checker";
export const manifest = {
    name: "comment-checker",
    lifecycle: ["tool.execute.before", "tool.execute.after"],
    factory: createCommentCheckerHooks,
};
