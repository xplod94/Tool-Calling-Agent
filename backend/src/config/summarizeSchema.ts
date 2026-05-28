import z from "zod";
import { webSearchStepResultSchema } from "./webSearchResultSchema.js";
import { ESummaryFallback } from "@/common/Enums.js";

export const summarizeInputSchema = z.object({
    text: z.string().min(50, 'Need a bit of text to summarize'),
});

export const summarizeOutputSchema = z.object({
    summary: z.string().min(1),
});

export const summarizedResult = summarizeOutputSchema.extend({
    url: z.url(),
});

export const summarizeStepOutput = webSearchStepResultSchema.extend({
    pageSummaries: z.array(summarizedResult),
    fallback: z.enum(ESummaryFallback),
});

export type TSummarizeOutput = z.infer<typeof summarizeOutputSchema>;

export type TSummarizedResult = z.infer<typeof summarizedResult>;

export type TSummarizeStepOutput = z.infer<typeof summarizeStepOutput>;
