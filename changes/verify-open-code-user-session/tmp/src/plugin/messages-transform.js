export function createMessagesTransformHandler(args) {
    return async (input, output) => {
        await args.hooks.contextInjectorMessagesTransform?.["experimental.chat.messages.transform"]?.(input, output);
        await args.hooks.thinkingBlockValidator?.["experimental.chat.messages.transform"]?.(input, output);
    };
}
