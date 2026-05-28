import { clip } from "@/common/helpers.js";
import { LLMInstance } from "@/common/ILLMFactory.js";
import { createLLM } from "@/config/llmFactory.js";
import { summarizeInputSchema, summarizeOutputSchema, TSummarizeOutput } from "@/config/summarizeSchema.js";
import { HumanMessage, SystemMessage } from "langchain";
import { logger } from "./logger.js";

export const summarize = async (text: string): Promise<TSummarizeOutput> => {
    // Keep temperature low so that summary stays factual, disable thinking to make summary generation faster
    // For reasoning capable models (Like Qwen) thinking can make generation slow. A simple summary generation does not require reasoning.
    const { llm: model, normalizer }: LLMInstance = createLLM({ temperature: 0.2, think: false });
    const { text: raw } = summarizeInputSchema.parse({ text });
    // We already clipped it to 8k chars while returning open URL results
    // (Optional) Further clipping to 4k characters to make context window smaller
    // const clipped = clip(raw, 4000);
    const clipped = raw;
    logger.debug(`summarize: Invoking model to generate the summary`);
    // Ask the model to summarize in a controlled manner
    const summaryResponse = await model.invoke([
        new SystemMessage(`
            You are a helpful assistant that writes short, accurate summaries.
            Guidelines:
                - Respond with only the answer, add nothing else.
                - Be factual and neutral, avoid marketing terms.
                - 5 to 8 sentences; no lists until absolutely necessary.
                - Do not invent sources, only summarize the provided text.
                - Keep it readable for beginners.
        `),
        new HumanMessage(`
            Summarize the following content for a beginner friendly audience.
            Focus on key facts and remove fluff.
            TEXT:-
            ${clipped}
        `)
    ]);

    logger.debug(`summarize: Summary generated`);
    const rawModelOutput: string = normalizer(summaryResponse);
    const summary = normalizeSummary(rawModelOutput);

    return summarizeOutputSchema.parse({ summary });
}

const normalizeSummary = (text: string): string => {
    const t = text
        .replace(/s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n')
        .trim();

    return clip(t, 2500);
}
