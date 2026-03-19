import { createBackgroundNotificationHook } from "../../../hooks/background-notification";
export const manifest = {
    name: "background-notification",
    lifecycle: ["chat.message", "event"],
    factory: createBackgroundNotificationHook,
};
