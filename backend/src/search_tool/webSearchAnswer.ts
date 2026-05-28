import { ERoute, ESummaryFallback } from "@/common/Enums.js";
import { LLMInstance } from "@/common/ILLMFactory.js";
import { TCandidate } from "@/config/answerSchema.js";
import { createLLM } from "@/config/llmFactory.js";
import { TOpenUrlResult } from "@/config/openURLSchema.js";
import { TRouterOutput } from "@/config/routerSchema.js";
import { TSummarizeOutput, TSummarizeStepOutput, TSummarizedResult } from "@/config/summarizeSchema.js";
import { TWebSearchResult, TWebSearchStepResult } from "@/config/webSearchResultSchema.js";
import { logger } from "@/utils/logger.js";
import { openUrls } from "@/utils/openUrl.js";
import { summarize } from "@/utils/summarize.js";
import { webSearch } from "@/utils/webSearch.js";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "langchain";
import { DUMMY_WEB_SEARCH_RESULT } from "../common/DUMMY_WEB_SEARCH_RESULT.js";
import { isDebugMode } from "@/config/env.js";

/**
 * 1. Search the web -> tavily (utils/webSearch.ts)
 * Performs an initial web search using Tavily API based on the query from the router output.
 * This step retrieves raw web search results (titles, snippets, and URLs) and stores them in
 * the input for subsequent processing. It acts as the first step in the search chain, transforming
 * the router output into web search results that can be used for answering questions.
 */
const webSearchStep = RunnableLambda.from<TRouterOutput, TWebSearchStepResult>(
    async (input: TRouterOutput): Promise<TWebSearchStepResult> => {
        const webSearchResults: TWebSearchResult[] = isDebugMode() ? DUMMY_WEB_SEARCH_RESULT : await webSearch(input.query);
        logger.debug(`webSearchStep: Web search results generated from Tavily: ${webSearchResults.map(r => r.url).join(', ')}`);

        return {
            ...input,
            webSearchResults,
        }
    }
);

/**
 * 2. Get the webpages (utils/webSearch.ts) & Summmarize the results (utils/summarize.ts)
 * Fetches and summarizes the content from each web search result URL. This step handles potential failures
 * gracefully using Promise.allSettled to ensure all URLs are attempted even if some fail. It opens each URL,
 * extracts the content, and generates a summary using the summarize utility. If URLs fail to load, it falls
 * back to using the search snippet as a summary. The step returns structured page summaries with URLs and
 * content summaries, along with a fallback indicator.
 */
const openUrlAndSummarizeStep = RunnableLambda.from<TWebSearchStepResult, TSummarizeStepOutput>(
    async (input: TWebSearchStepResult): Promise<TSummarizeStepOutput> => {
        // 1. If no web search results received, return empty result.
        if (!Array.isArray(input.webSearchResults) || input.webSearchResults.length === 0) {
            logger.warn('openUrlAndSummarizeStep: No web search results found, returning empty result');
            return {
                ...input,
                pageSummaries: [],
                fallback: ESummaryFallback.no_results as const
            };
        }

        // 2. Open URLs and get the data from the web pages
        const openUrlsResult = await openUrls(input.webSearchResults.map(r => r.url));
        logger.debug(`openUrlAndSummarizeStep: Opened URLs and got the results: ${JSON.stringify(openUrlsResult)}`);

        // 3. Get summaries for each web search result and collate them
        // ====== OPTION 1: Concurrent calls to the model for summary (Might fail for local LLM)
        // const resultsFromUrls = await Promise.allSettled(
        //     openUrlsResult.map(
        //         async (dataFromUrl: TOpenUrlResult, index: number): Promise<TSummarizedResult> => {
        //             // If page content is not available, use the snippet from tavily
        //             const content = dataFromUrl.content.length ? dataFromUrl.content : input.webSearchResults[index].snippet;
        //             const summarizedContent: TSummarizeOutput = await summarize(content);
        //             return {
        //                 url: dataFromUrl.url,
        //                 summary: summarizedContent.summary
        //             }
        //         }
        //     )
        // );
        // ====== OPTION 2: Alternatively, Sequential calls for summary
        const resultsFromUrls: PromiseSettledResult<TSummarizedResult>[] = [];
        for (const [index, dataFromUrl] of openUrlsResult.entries()) {
            try {
                const urlData: TOpenUrlResult = dataFromUrl;
                const content = urlData.content.length
                    ? urlData.content
                    : input.webSearchResults[index].snippet;

                logger.debug(`openUrlAndSummarizeStep: Generating summary for ${dataFromUrl.url}`);
                const summarizedContent: TSummarizeOutput = await summarize(content);

                logger.debug(`openUrlAndSummarizeStep: Summary generated for ${dataFromUrl.url}`);
                resultsFromUrls.push({
                    status: "fulfilled",
                    value: { url: urlData.url, summary: summarizedContent.summary }
                });
            } catch (reason) {
                logger.warn(`openUrlAndSummarizeStep: Summary errored for ${dataFromUrl.url}: ${JSON.stringify(reason)}`);
                resultsFromUrls.push({ status: "rejected", reason });
            }
        }

        // Filter the fulfilled promises & collate the resulting values
        const completedResultsWithSummaries: TSummarizedResult[] = resultsFromUrls
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        // 3. If no summarized results [edge case], return fallback summaries
        if (completedResultsWithSummaries.length === 0) {
            logger.warn('openUrlAndSummarizeStep: No summaries generated, returning fallback summaries');
            const fallbackSummaries: TSummarizedResult[] = input.webSearchResults
                .map((result: TWebSearchResult) => ({
                    url: result.url,
                    summary: String(result.snippet || result.title || '').trim()
                }))
                .filter((result: any) => result.summary.length > 0);

            return {
                ...input,
                pageSummaries: fallbackSummaries,
                fallback: ESummaryFallback.snippets as const
            }
        }

        logger.debug('openUrlAndSummarizeStep: Returning summarized results');
        // 4. Return the summarized results
        return {
            ...input,
            pageSummaries: completedResultsWithSummaries,
            fallback: ESummaryFallback.none
        }
    }
);

/**
 * 3. Return the candidate (search_tool/types.ts) [answer, sources, mode]
 * Generates the final answer using a chat model, either from training data or web search results.
 * If no web search summaries are available, it answers directly from the model's training knowledge.
 * Otherwise, it uses the provided webpage summaries to construct an accurate, neutral answer
 * (5-8 sentences max) with proper citations. The step returns the answer, sources (URLs),
 * and the route mode (direct or web).
 */
const composeAnswerStep = RunnableLambda.from<TSummarizeStepOutput, TCandidate>(
    async (input: TSummarizeStepOutput): Promise<TCandidate> => {
        const { llm: model, normalizer }: LLMInstance = createLLM();

        // If no web search result summaries are there, try to answer directly from training knowledge
        if (!input.pageSummaries || input.pageSummaries.length === 0) {
            logger.warn('composeAnswerStep: No web search summaries present, answering directly');
            const response = await model.invoke([
                new SystemMessage(`
                    You are a helpful assistant. Answer clearly and briefly.
                    Answer from your training data. Do not invent facts.
                    If you are unsure, just say so.
                `),
                new HumanMessage(input.query),
            ]);

            logger.warn('composeAnswerStep: No web search summaries present, direct answer generated');
            const answer = normalizer(response);

            return {
                answer,
                sources: [],
                mode: ERoute.direct,
            }
        }

        logger.debug('composeAnswerStep: Generating final answer from web search summaries');
        const response = await model.invoke([
            new SystemMessage(`
                You are a helpful assistant. Concisely answer questions using provided webpage summaries.
                Respond with the answer to the Question using the given webpage summaries.
                Rules:-
                    - 8 to 10 sentences max
                    - Be accurate and neutral.
                    - Respond with only the answer, add nothing else. 
                    - Use only the provided summaries, do not invent new facts or sources.
            `),
            new HumanMessage(`
                Question: ${input.query}
                Summaries: ${JSON.stringify(input.pageSummaries, null, 2)}
            `),
        ]);

        logger.debug('composeAnswerStep: Final answer generated, returning the final answer');
        const answer = normalizer(response);

        return {
            answer,
            sources: input.pageSummaries.map(r => r.url),
            mode: ERoute.web,
        }
    }
);

/**
 * 4. Create the LCEL chain
 * A complete LCEL (LangChain Expression Language) chain that orchestrates the entire web search and answer
 * generation workflow. It sequentially executes three steps: (1) web search via Tavily, (2) URL fetching
 * and content summarization, and (3) answer composition using the chat model. The chain transforms the
 * initial router output into a final answer with sources, enabling the tool-calling system to provide
 * web-based responses to user queries.
 */
export const webSearchAnswerChain = RunnableSequence.from<TRouterOutput, TCandidate>([webSearchStep, openUrlAndSummarizeStep, composeAnswerStep]);
