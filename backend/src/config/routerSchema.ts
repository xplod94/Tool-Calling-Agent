import { ERoute } from "@/common/Enums.js";
import z from "zod";

export const routerInputSchema = z.object({
    query: z.string().min(3),
});

export const routerOutputSchema = routerInputSchema.extend({
    mode: z.enum(ERoute),
});

export type TRouterInput = z.infer<typeof routerInputSchema>;

export type TRouterOutput = z.infer<typeof routerOutputSchema>;
