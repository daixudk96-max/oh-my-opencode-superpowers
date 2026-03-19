import { z } from "zod";
export const FallbackModelsSchema = z.union([z.string(), z.array(z.string())]);
