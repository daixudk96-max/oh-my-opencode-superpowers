import { toNewLines } from "./edit-text-normalization";
import { normalizeLineRef } from "./validation";
function normalizeEditPayload(payload) {
    return toNewLines(payload).join("\n");
}
function canonicalAnchor(anchor) {
    if (!anchor)
        return "";
    return normalizeLineRef(anchor);
}
function buildDedupeKey(edit) {
    switch (edit.op) {
        case "replace":
            return `replace|${canonicalAnchor(edit.pos)}|${edit.end ? canonicalAnchor(edit.end) : ""}|${normalizeEditPayload(edit.lines)}`;
        case "append":
            return `append|${canonicalAnchor(edit.pos)}|${normalizeEditPayload(edit.lines)}`;
        case "prepend":
            return `prepend|${canonicalAnchor(edit.pos)}|${normalizeEditPayload(edit.lines)}`;
        default:
            return JSON.stringify(edit);
    }
}
export function dedupeEdits(edits) {
    const seen = new Set();
    const deduped = [];
    let deduplicatedEdits = 0;
    for (const edit of edits) {
        const key = buildDedupeKey(edit);
        if (seen.has(key)) {
            deduplicatedEdits += 1;
            continue;
        }
        seen.add(key);
        deduped.push(edit);
    }
    return { edits: deduped, deduplicatedEdits };
}
