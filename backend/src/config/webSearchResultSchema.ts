import z from "zod";
import { routerOutputSchema } from "./routerSchema.js";

export const webSearchResultSchema = z.object({
    title: z.string().min(1),
    url: z.url(),
    snippet: z.string().optional().default(''),
});

export const webSearchResultsSchema = z.array(webSearchResultSchema).max(10);

export const webSearchStepResultSchema = routerOutputSchema.extend({
    webSearchResults: webSearchResultsSchema,
});

export type TWebSearchResult = z.infer<typeof webSearchResultSchema>;

export type TWebSearchStepResult = z.infer<typeof webSearchStepResultSchema>;
