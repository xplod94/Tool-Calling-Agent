import { ERoute, ERouteStrategies } from "@/common/Enums.js";
import { LLMInstance } from "@/common/ILLMFactory.js";
import { env } from "@/config/env.js";
import { createLLM } from "@/config/llmFactory.js";
import { routerInputSchema, TRouterInput, TRouterOutput } from "@/config/routerSchema.js";
import { logger } from "@/utils/logger.js";
import { RunnableLambda } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "langchain";

/**
 * Routes a user query to either 'web' or 'direct' based on whether it requires
 * current information from the web or can be answered from training knowledge.
 * 
 * @param query - The user's query to route
 * @returns A Promise resolving to 'web' if web search is needed, 'direct' otherwise
 */
export const routeStrategy = async (query: string): Promise<ERoute> => {
    let route!: ERoute;
    const trimmedQuery = query.toLowerCase().trim();

    logger.debug(`routeStrategy: Creating route strategy as per level: ***${env.ROUTE_STRATEGY}***`);
    // Use advanced route strategy ONLY if specifically configured
    if (env.ROUTE_STRATEGY === ERouteStrategies.advanced) {
        route = await advancedRouteStrategy(trimmedQuery);
    } else {
        route = basicRouteStrategy(trimmedQuery);
    }

    logger.debug(`routeStrategy: Route chosen for query: "${trimmedQuery}": ***${route}***`);
    return route;
}

/**
 * Basic route strategy that determines if a query requires web search based on
 * keyword patterns and recent year detection.
 * 
 * @param query - The user's query to analyze
 * @returns 'web' if web search is needed, 'direct' otherwise
 */
const basicRouteStrategy = (query: string): ERoute => {
    // Step 1: Check if the user is asking for recent year data
    const isQueryForRecentYearData = /\b20(2[4-9]|3[0-9])\b/.test(query);
    if (isQueryForRecentYearData) return ERoute.web;

    // Step 2: Check if the user is asking for some common web search
    // data like comparisons, rankings, prices, latest data, news, weather etc.
    const patterns: RegExp[] = [
        /\btop[-\s]*\d+\b/u,
        /\bbest\b/u,
        /\brank(?:ing|ings)?\b/u,
        /\bwhich\s+is\s+better\b/u,
        /\b(?:vs\.?|versus)\b/u,
        /\bcompare|comparison\b/u,

        /\bprice|prices|pricing|cost|costs|cheapest|cheaper|affordable\b/u,
        /\bunder\s*\d+(?:\s*[kK])?\b/u,
        /\p{Sc}\s*\d+/u,

        /\btemperature|weather|rain\b/u,

        /\blatest|today|now|current\b/u,
        /\bnews|breaking|trending\b/u,
        /\b(released?|launch|launched|announce|announced|update|updated)\b/u,
        /\bchangelog|release\s*notes?\b/u,

        /\bdeprecated|eol|end\s*of\s*life|sunset\b/u,
        /\broadmap\b/u,

        /\bworks\s+with|compatible\s+with|support(?:ed)?\s+on\b/u,
        /\binstall(ation)?\b/u,

        /\bnear\s+me|nearby\b/u,
    ];

    const isQueryInPatterns = patterns.some(pattern => pattern.test(query));
    if (isQueryInPatterns) return ERoute.web;

    return ERoute.direct;
}

/**
 * Advanced route strategy that uses an LLM to determine if a query requires web search.
 * This method leverages a chat model to analyze the query and make a more nuanced
 * decision about whether web search is needed based on current information requirements.
 * 
 * The model is instructed to reply with only 'web' or 'direct' without any explanation.
 * It evaluates queries based on whether they need current, real-time, or recent information
 * (e.g., news, stock prices, weather, latest releases, live scores, recent events)
 * versus general knowledge (e.g., coding help, math, definitions, reasoning, history).
 * 
 * @param query - The user's query to analyze
 * @returns A Promise resolving to 'web' if web search is needed, 'direct' otherwise
 */
const advancedRouteStrategy = async (query: string): Promise<ERoute> => {
    // Keep temperature 0 to get the desired answer
    const { llm: model, normalizer }: LLMInstance = createLLM({ temperature: 0 });

    const routeStrategyResponse = await model.invoke([
        new SystemMessage(`
            You are a routing assistant. Your only job is to decide whether a question
            requires searching the web or can be answered directly from your training knowledge.

            Reply with ONLY one word — no explanation, no punctuation:
            - Reply 'web' if the question needs current, real-time, or recent information
            (e.g. news, stock prices, weather, latest releases, live scores, recent events).
            - Reply 'direct' if the question can be answered from general knowledge
            (e.g. coding help, math, definitions, reasoning, history, explanations).
        `),
        new HumanMessage(`${query}`),
    ]);

    const rawModelOutput = normalizer(routeStrategyResponse);
    const result = rawModelOutput.trim().toLowerCase();

    // Safeguard: handle unexpected model output
    if (result.includes(`${ERoute.web}`)) return ERoute.web;
    if (result.includes(`${ERoute.direct}`)) return ERoute.direct;
    return ERoute.direct; // safe fallback
}

export const routerStep = RunnableLambda.from(async (input: TRouterInput): Promise<TRouterOutput> => {
    const { query } = routerInputSchema.parse(input);
    const mode = await routeStrategy(query);

    return {
        query,
        mode,
    };
});
