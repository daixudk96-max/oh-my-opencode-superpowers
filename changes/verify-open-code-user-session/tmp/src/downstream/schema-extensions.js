import { createHookNameSchema } from "../config/schema/hooks";
export const extendHookNameSchema = (additionalNames) => {
    return createHookNameSchema(additionalNames);
};
