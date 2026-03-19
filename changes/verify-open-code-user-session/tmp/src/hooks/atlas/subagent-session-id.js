export function extractSessionIdFromOutput(output) {
    const match = output.match(/Session ID:\s*(ses_[a-zA-Z0-9]+)/);
    return match?.[1] ?? "<session_id>";
}
