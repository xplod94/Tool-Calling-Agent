import { logger } from './logger.js';
import { TWebSearchResult, webSearchResultSchema, webSearchResultsSchema } from '../config/webSearchResultSchema.js';
import { env } from '../config/env.js';
import { IWebSearchResponse, IWebSearchResult } from '@/common/ISearchResponse.js';
import z from 'zod';

/**
 * Web search tool that uses Tavily API to search the web.
 * This tool can be invoked by LLMs when they need to search for current information.
 */
export const webSearch = async (query: string, maxResults: number = 5): Promise<TWebSearchResult[]> => {
    logger.debug(`webSearch: Web search requested for query: ${query}`);

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        logger.warn('webSearch: Invalid search query provided');
        return [];
    }

    const trimmedQuery = query.trim();

    try {
        // Check if Tavily API key is configured
        if (!env.TAVILY_API_KEY || env.TAVILY_API_KEY.trim() === '') {
            logger.warn('webSearch: Tavily API key not configured, returning empty results');
            return [];
        }

        // Perform web search using Tavily API
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.TAVILY_API_KEY}`,
            },
            body: JSON.stringify({
                query: trimmedQuery,
                max_results: maxResults,
                search_depth: 'basic',
                include_answer: false,
                include_images: false,
                include_raw_content: 'text',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`webSearch: Tavily API error: ${response.status} - ${errorText}`);
            throw new Error(`Tavily API request failed: ${response.status}`);
        }

        const data: IWebSearchResponse = await response.json() as IWebSearchResponse;

        // Validate and transform Tavily response to our schema format
        const results = transformTavilyResults(data);

        // Validate against schema
        const validatedResults = webSearchResultsSchema.safeParse(results);

        if (!validatedResults.success) {
            logger.error('webSearch: Failed to validate web search results', {
                errors: z.treeifyError(validatedResults.error),
                rawResults: results
            });
            return [];
        }

        logger.debug(`webSearch: Web search completed successfully, found ${validatedResults.data.length} results`);
        return validatedResults.data;

    } catch (error) {
        logger.error('webSearch: Web search failed', { error: (error as Error).message });
        return [];
    }
};

/**
 * Transform Tavily API response to our WebSearchResult schema format
 */
function transformTavilyResults(data: IWebSearchResponse): TWebSearchResult[] {
    if (!data || !Array.isArray(data.results)) {
        logger.warn('webSearch: No results found in Tavily response');
        return [];
    }

    const results: TWebSearchResult[] = data.results.map((webSearchResult: IWebSearchResult) => webSearchResultSchema.parse({
        title: String(webSearchResult.title ?? '').trim() || 'Untitled',
        url: String(webSearchResult.url ?? '').trim(),
        snippet: String(webSearchResult.raw_content ?? webSearchResult.content ?? '').trim(),
    }));

    return results;
}
