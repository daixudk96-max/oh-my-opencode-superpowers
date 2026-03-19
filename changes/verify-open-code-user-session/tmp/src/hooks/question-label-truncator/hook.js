const MAX_LABEL_LENGTH = 30;
function truncateLabel(label, maxLength = MAX_LABEL_LENGTH) {
    if (label.length <= maxLength) {
        return label;
    }
    return label.substring(0, maxLength - 3) + "...";
}
function truncateQuestionLabels(args) {
    if (!args.questions || !Array.isArray(args.questions)) {
        return args;
    }
    return {
        ...args,
        questions: args.questions.map((question) => ({
            ...question,
            options: question.options?.map((option) => ({
                ...option,
                label: truncateLabel(option.label),
            })) ?? [],
        })),
    };
}
export function createQuestionLabelTruncatorHook() {
    return {
        "tool.execute.before": async (input, output) => {
            const toolName = input.tool?.toLowerCase();
            if (toolName === "askuserquestion" || toolName === "ask_user_question") {
                const args = output.args;
                if (args?.questions) {
                    const truncatedArgs = truncateQuestionLabels(args);
                    Object.assign(output.args, truncatedArgs);
                }
            }
        },
    };
}
