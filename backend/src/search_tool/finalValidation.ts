import { LLMInstance } from "@/common/ILLMFactory.js";
import { finalAnswerSchema, TCandidate, TFinalAnswer } from "@/config/answerSchema.js";
import { createLLM } from "@/config/llmFactory.js";
import { logger } from "@/utils/logger.js";
import { RunnableLambda } from "@langchain/core/runnables";
import { createAgent, HumanMessage } from "langchain";

export const finalValidationStep = RunnableLambda.from<TCandidate, TFinalAnswer>(
    async (candidate: TCandidate): Promise<TFinalAnswer> => {
        const finalDraft: TFinalAnswer = {
            answer: candidate.answer ?? '',
            sources: candidate.sources ?? [],
        }
        logger.debug('finalValidationStep: final draft created, trying to parse the draft answer');
        const parsedFinalDraft = finalAnswerSchema.safeParse(finalDraft);
        if (parsedFinalDraft.success) return parsedFinalDraft.data;

        logger.warn('finalValidationStep: Failed to safely parse the final draft answer');
        // Perform one shot repair if the parsing was not a success
        const repairedFinalDraft = await repairSearchAnswer(candidate);
        const parsedRepairedFinalDraft = finalAnswerSchema.safeParse(repairedFinalDraft);
        if (parsedRepairedFinalDraft.success) return parsedRepairedFinalDraft.data;

        logger.warn('finalValidationStep: The repaired JSON created by agent could not be safely parsed either, returning empty answer');
        return {
            answer: repairedFinalDraft.answer ?? '',
            sources: repairedFinalDraft.sources ?? [],
        };
    }
);

const repairSearchAnswer = async (candidate: TCandidate): Promise<TFinalAnswer> => {
    const { llm: model }: LLMInstance = createLLM({ temperature: 0.2, think: false });
    logger.debug('finalValidationStep: repairSearchAnswer: Invoking agent to perform one shot repair for the draft answer');
    const agent = createAgent({
        model,
        responseFormat: finalAnswerSchema,
        systemPrompt: `
            You are an assistant that fixes JSON objects.
            Respond only with valid JSON object.
        `
    });

    logger.debug('finalValidationStep: repairSearchAnswer: Agent repaired and created the final answer JSON');
    const response = await agent.invoke({
        messages: new HumanMessage(`
            Make this match the response format schema.
            Make sure sources is a URL of strings.
            Input JSON: ${JSON.stringify(candidate)}
        `),
    });

    const repairedJSON = response.structuredResponse;

    return {
        ...repairedJSON,
        sources: repairedJSON.sources ?? [],
    };
}
