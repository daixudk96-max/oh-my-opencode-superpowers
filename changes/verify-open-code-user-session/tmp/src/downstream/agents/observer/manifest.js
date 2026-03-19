import { createObserverAgent, OBSERVER_PROMPT_METADATA } from "../../../agents/observer";
export const manifest = {
    name: "observer",
    factory: createObserverAgent,
    metadata: OBSERVER_PROMPT_METADATA,
};
