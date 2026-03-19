import { SlopDetector } from "../../shared/slop-detector";
const DEFAULT_CONFIG = {
    commentThreshold: 0.5,
    verboseLengthThreshold: 500,
    repetitionThreshold: 0.3,
    refreshInterval: 10,
    guidelines: `

---
[BEHAVIOR ANCHOR]
You are producing output that may contain slop patterns. Adhere to these guidelines:
- Minimize comments - code should be self-documenting
- Be concise - avoid verbose explanations before code
- Avoid repetitive patterns - each line should add unique value
- Match the codebase's existing style
---
`,
};
export function createBehaviorAnchorHook(config) {
    const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...config,
    };
    const detector = new SlopDetector(mergedConfig);
    let round = 0;
    return {
        "tool.execute.after": async (_input, output) => {
            round++;
            const result = detector.detect(output.output, round);
            if (result.injectedGuidelines) {
                output.output += result.injectedGuidelines;
            }
        },
    };
}
