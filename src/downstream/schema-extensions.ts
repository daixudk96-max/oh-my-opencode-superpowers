import { createHookNameSchema } from "../config/schema/hooks";

export const extendHookNameSchema = (additionalNames: string[]) => {
	return createHookNameSchema(additionalNames);
};
