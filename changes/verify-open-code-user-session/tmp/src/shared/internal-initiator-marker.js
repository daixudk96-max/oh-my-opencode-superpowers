export const OMO_INTERNAL_INITIATOR_MARKER = "<!-- OMO_INTERNAL_INITIATOR -->";
export function createInternalAgentTextPart(text) {
    return {
        type: "text",
        text: `${text}\n${OMO_INTERNAL_INITIATOR_MARKER}`,
    };
}
