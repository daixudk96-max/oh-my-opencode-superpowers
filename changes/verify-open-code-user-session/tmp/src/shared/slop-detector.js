export class SlopDetector {
    config;
    constructor(config) {
        this.config = config;
    }
    detect(content, round) {
        const reasons = [];
        // Check for excessive comments
        if (this.detectExcessiveComments(content)) {
            reasons.push("excessive_comments");
        }
        // Check for verbose explanations
        if (this.detectVerboseExplanations(content)) {
            reasons.push("verbose_explanation");
        }
        // Check for repetitive code
        if (this.detectRepetitiveCode(content)) {
            reasons.push("repetitive_code");
        }
        const isSlop = reasons.length > 0;
        const shouldRefresh = round % this.config.refreshInterval === 0;
        let injectedGuidelines;
        if (isSlop || shouldRefresh) {
            injectedGuidelines = this.config.guidelines;
        }
        return {
            isSlop,
            reasons,
            injectedGuidelines
        };
    }
    detectExcessiveComments(content) {
        const lines = content.trim().split("\n").filter(l => l.trim().length > 0);
        if (lines.length === 0)
            return false;
        const commentLines = lines.filter(l => l.trim().startsWith("//") || l.trim().startsWith("/*") || l.trim().startsWith("*"));
        return commentLines.length / lines.length >= this.config.commentThreshold;
    }
    detectVerboseExplanations(content) {
        // Basic heuristic: look for text before first code block
        const codeBlockMatch = content.match(/```/);
        if (codeBlockMatch) {
            const precedingText = content.substring(0, codeBlockMatch.index).trim();
            return precedingText.length > this.config.verboseLengthThreshold;
        }
        // If no code block, check entire length
        return content.length > this.config.verboseLengthThreshold * 2;
    }
    detectRepetitiveCode(content) {
        const lines = content.trim().split("\n").map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 3)
            return false;
        const lineCounts = new Map();
        for (const line of lines) {
            lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
        }
        let repetitiveLineCount = 0;
        for (const count of lineCounts.values()) {
            if (count > 1) {
                repetitiveLineCount += count;
            }
        }
        return repetitiveLineCount / lines.length >= this.config.repetitionThreshold;
    }
}
