import { createSessionScorer } from "../../../features/session-scorer";
export const manifest = {
    name: "session-scorer",
    lifecycle: ["event"],
    factory: () => {
        const scorer = createSessionScorer();
        return {
            event: scorer.event?.bind(scorer),
        };
    },
};
