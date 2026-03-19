/**
 * Part Factory - Creates Part objects conforming to OpenCode SDK schema.
 *
 * OpenCode SDK requires Part objects to have:
 * - id: string (unique identifier)
 * - sessionID: string
 * - messageID: string
 * - type: "text" | "file" | etc.
 *
 * @see opencode/packages/opencode/src/session/message-v2.ts
 */
/**
 * Creates a TextPart object conforming to OpenCode SDK schema.
 *
 * @param input - The input parameters
 * @param input.sessionID - The session ID
 * @param input.messageID - The message ID (optional, will generate UUID if not provided)
 * @param input.text - The text content
 * @returns A complete TextPart object with all required fields
 *
 * @example
 * ```typescript
 * output.parts.push(createTextPart({
 *   sessionID: input.sessionID,
 *   messageID: input.messageID,
 *   text: "Hello, world!",
 * }))
 * ```
 */
export function createTextPart(input) {
    return {
        id: crypto.randomUUID(),
        sessionID: input.sessionID,
        messageID: input.messageID ?? crypto.randomUUID(),
        type: "text",
        text: input.text,
    };
}
