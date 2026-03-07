import type { PluginInput } from "@opencode-ai/plugin"
import { existsSync, readFileSync } from "node:fs"
import { log } from "../../shared/logger"
import { HOOK_NAME } from "./constants"
import { withTimeout } from "./with-timeout"

interface OpenCodeSessionMessage {
	info?: { role?: string }
	parts?: Array<{ type: string; text?: string }>
}

interface TranscriptEntry {
	type?: string
	content?: unknown
	tool_output?: unknown
}

function escapeRegex(str: string): string {
	const specialCharacters = new Set([
		"\\",
		".",
		"*",
		"+",
		"?",
		"^",
		"$",
		"{",
		"}",
		"(",
		")",
		"|",
		"[",
		"]",
	])

	let escaped = ""
	for (const character of str) {
		escaped += specialCharacters.has(character) ? `\\${character}` : character
	}
	return escaped
}

function buildPromisePattern(promise: string): RegExp {
	return new RegExp(`<promise>\\s*${escapeRegex(promise)}\\s*</promise>`, "is")
}

function isInstructionLikePromiseMention(text: string): boolean {
	if (!text) return false

	const normalized = text.replace(/\s+/g, " ").trim().toLowerCase()
	if (!normalized.includes("<promise")) return false

	if (/\binstruction\b/.test(normalized)) return true

	return /(?:when|once|if)\s+.{0,80}\bcomplete\b.{0,120}\b(?:output|return|print|emit|respond)\b/.test(
		normalized,
	)
}

function isCompletionText(text: string, pattern: RegExp): boolean {
	if (!pattern.test(text)) return false
	return !isInstructionLikePromiseMention(text)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getToolOutputTextCandidates(toolOutput: unknown): string[] {
	if (typeof toolOutput === "string") return [toolOutput]
	if (!isRecord(toolOutput)) return []

	const candidates: string[] = []
	if (typeof toolOutput.output === "string") candidates.push(toolOutput.output)
	if (typeof toolOutput.content === "string") candidates.push(toolOutput.content)
	if (typeof toolOutput.text === "string") candidates.push(toolOutput.text)
	return candidates
}

export function detectCompletionInTranscript(
	transcriptPath: string | undefined,
	promise: string,
): boolean {
	if (!transcriptPath) return false

	try {
		if (!existsSync(transcriptPath)) return false

		const content = readFileSync(transcriptPath, "utf-8")
		const pattern = buildPromisePattern(promise)
		const lines = content.split("\n").filter((line) => line.trim())

		for (const line of lines) {
			try {
				const entry = JSON.parse(line) as TranscriptEntry

				if (entry.type !== "user" && entry.type !== "tool_use") {
					if (entry.type === "assistant") {
						if (typeof entry.content === "string" && isCompletionText(entry.content, pattern)) {
							return true
						}
					} else if (entry.type === "tool_result") {
						const candidates = getToolOutputTextCandidates(entry.tool_output)
						if (candidates.some((candidate) => isCompletionText(candidate, pattern))) {
							return true
						}
					}
				}
			} catch {
			}
		}
		return false
	} catch {
		return false
	}
}

export async function detectCompletionInSessionMessages(
	ctx: PluginInput,
	options: {
		sessionID: string
		promise: string
		apiTimeoutMs: number
		directory: string
		sinceMessageIndex?: number
	},
): Promise<boolean> {
	try {
		const response = await withTimeout(
			ctx.client.session.messages({
				path: { id: options.sessionID },
				query: { directory: options.directory },
			}),
			options.apiTimeoutMs,
		)

		const messagesResponse: unknown = response
		const responseData =
			typeof messagesResponse === "object" && messagesResponse !== null && "data" in messagesResponse
				? (messagesResponse as { data?: unknown }).data
				: undefined

		const messageArray: unknown[] = Array.isArray(messagesResponse)
			? messagesResponse
			: Array.isArray(responseData)
				? responseData
				: []

		const scopedMessages =
			typeof options.sinceMessageIndex === "number" && options.sinceMessageIndex >= 0 && options.sinceMessageIndex < messageArray.length
				? messageArray.slice(options.sinceMessageIndex)
				: messageArray

		const assistantMessages = (scopedMessages as OpenCodeSessionMessage[]).filter((message) => message.info?.role === "assistant")
		if (assistantMessages.length === 0) return false

		const pattern = buildPromisePattern(options.promise)
		for (let index = assistantMessages.length - 1; index >= 0; index -= 1) {
			const assistant = assistantMessages[index]
			if (!assistant.parts) continue

			let responseText = ""
			for (const part of assistant.parts) {
				if (part.type !== "text") continue
				responseText += `${responseText ? "\n" : ""}${part.text ?? ""}`
			}

			if (isCompletionText(responseText, pattern)) {
				return true
			}
		}

		return false
	} catch (error) {
		setTimeout(() => {
			log(`[${HOOK_NAME}] Session messages check failed`, {
				sessionID: options.sessionID,
				error: String(error),
			})
		}, 0)
		return false
	}
}
