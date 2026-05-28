import { ERoute } from "@/common/Enums.js";
import { TCandidate, TFinalAnswer } from "@/config/answerSchema.js";
import { TRouterInput, TRouterOutput } from "@/config/routerSchema.js";
import { RunnableBranch, RunnableSequence } from "@langchain/core/runnables";
import { directAnswerStep } from "./directAnswer.js";
import { webSearchAnswerChain } from "./webSearchAnswer.js";
import { routerStep } from "./routeStrategy.js";
import { finalValidationStep } from "./finalValidation.js";
import { logger } from "@/utils/logger.js";

// Branch that decides if the web search pipeline is to be called or query is to be directly answered
// Takes as an input the output from router and decides based on the 'mode' output by the router.
const answerBranch = RunnableBranch.from<TRouterOutput, TCandidate>(
    [
        [(input: TRouterOutput) => input.mode === ERoute.web, webSearchAnswerChain],
        directAnswerStep
    ]
);

// LCEL chain, first decides whether to search the web or answer directly
// Then returns and validates the final answer
const searchChain = RunnableSequence.from<TRouterInput, TFinalAnswer>([
    routerStep,
    answerBranch,
    finalValidationStep
]);

export const runSearch = async (input: TRouterInput): Promise<TFinalAnswer> => {
    logger.debug('runSearch: Invoking searchChain.');
    return await searchChain.invoke(input);
}
