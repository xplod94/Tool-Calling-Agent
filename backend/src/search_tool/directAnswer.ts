import { RunnableLambda } from "@langchain/core/runnables";
import { TRouterOutput } from "@/config/routerSchema.js";
import { HumanMessage, SystemMessage } from "langchain";
import { ERoute } from "@/common/Enums.js";
import { TCandidate } from "@/config/answerSchema.js";
import { LLMInstance } from "@/common/ILLMFactory.js";
import { createLLM } from "@/config/llmFactory.js";
import { logger } from "@/utils/logger.js";

export const directAnswerStep = RunnableLambda.from<TRouterOutput, TCandidate>(
    async (input: TRouterOutput): Promise<TCandidate> => {
        const { llm: model, normalizer }: LLMInstance = createLLM();

        logger.debug('directAnswerStep: Invoking model for direct answer');
        const response = await model.invoke([
            new SystemMessage(`
                You are a helpful assistant. Answer clearly and briefly.
                Answer from your training data. Do not invent facts.
                If you are unsure, just say so.
            `),
            new HumanMessage(input.query),
        ]);

        logger.debug('directAnswerStep: Direct answer generated, returning direct answer');
        const answer = normalizer(response);

        return {
            answer,
            sources: [],
            mode: ERoute.direct,
        }
    }
);
