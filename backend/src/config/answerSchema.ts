import { ERoute } from "@/common/Enums.js";
import z from "zod";

export const finalAnswerSchema = z.object({
    answer: z.string().min(1),
    sources: z.array(z.url()).default([]),
});

export const candidateSchema = finalAnswerSchema.extend({
    mode: z.enum(ERoute),
});

export type TFinalAnswer = z.infer<typeof finalAnswerSchema>;

export type TCandidate = z.infer<typeof candidateSchema>;
