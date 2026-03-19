import { createInstinctLearnerHook } from "../../../hooks/instinct-learner";
export const manifest = {
    name: "instinct-learner",
    lifecycle: ["tool.execute.after", "event"],
    factory: createInstinctLearnerHook,
};
