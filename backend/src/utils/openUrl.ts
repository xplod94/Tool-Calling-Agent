import { convert } from 'html-to-text';
import { logger } from './logger.js';
import { openUrlOutputSchema, TOpenUrlResult } from '@/config/openURLSchema.js';
import { clip, safeText, validateUrl } from '@/common/helpers.js';
import { chromium } from 'playwright';
import pLimit from 'p-limit';

/**
 * Uses playright to fetch the content from given URLs and converts HTML to plain text.
 * Validates the URLs, fetches the pages, and extracts readable text content.
 * NOTE: This might still fail on some websites as they are still able to block this
 * 
 * @param urls - The list of URLs to fetch content from
 * @returns Array of the extracted plain text content from the URLs
 */
export const openUrls = async (urls: string[]): Promise<TOpenUrlResult[]> => {
    const limit = pLimit(4); // max 4 pages open at once [concurrency]
    const browser = await chromium.launch();
    const results: TOpenUrlResult[] = await Promise.all(
        urls.map(url => limit(async () => {
            logger.debug(`openUrls: Open url: ${url}`);
            // Step 1: Validate the URL
            const normalizedUrl = validateUrl(url);
            const page = await browser.newPage();

            try {
                // Step 2: Fetch the page
                await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
                const htmlContent = await page.content();
                // Step 3: Convert HTML -> Plain Text [Clean up & remove the tags]
                const selectorsToDiscard: string[] = ['nav', 'header', 'footer', 'script', 'style', 'meta', 'link', 'img'];
                const pageContent = convert(htmlContent, {
                    wordwrap: false,
                    selectors: selectorsToDiscard.map(selector => ({ selector, format: 'skip' })),
                });
                // Step 4: Clean the extra white spaces & cap the text limit to 8000 chars
                const cleanedPageContent = pageContent.replace(/s+/g, ' ').trim();
                const clippedPageContent = clip(cleanedPageContent, 8000);
                logger.debug(`openUrls: Content fetched for URL: ${normalizedUrl}`);
                return {
                    url: normalizedUrl,
                    content: clippedPageContent,
                }
            } catch (e) {
                logger.error(`openUrls: OpenURL failed: ${url}: ${JSON.stringify(e)}}`);
                return {
                    url: normalizedUrl,
                    content: '',
                }
            } finally {
                await page.close();
            }
        }))
    );

    return results;
}

/**
 * Fetches the content from a URL and converts HTML to plain text.
 * Validates the URL, fetches the page, and extracts readable text content.
 * NOTE: This function does not work for most websites as they block node fetch calls
 * 
 * @param url - The URL to fetch content from
 * @returns The extracted plain text content from the URL
 */
export const openUrl = async (url: string): Promise<TOpenUrlResult> => {
    logger.debug(`openUrl: Open url: ${url}`);
    // Step 1: Validate the URL
    const normalizedUrl = validateUrl(url);
    // Step 2: Fetch the page
    // IMP: We need to add the 'User-Agent' header here because strict websites
    // will block a generic node-fetch. So we need to override this header to
    // prevent an instant 403 error response.
    const res = await fetch(normalizedUrl, {
        headers: {
            'User-Agent': 'agent-core/1.0'
        }
    });

    if (!res.ok) {
        const body = safeText(res);
        logger.error(`openUrl: OpenURL failed: ${normalizedUrl}: ${res.status} - ${JSON.stringify(body)}`);
        throw new Error(`OpenURL failed: ${normalizedUrl}: ${res.status} - ${JSON.stringify(body)}`);
    }

    // Step 3: Check the content type
    const contentType = res.headers.get('Content-Type') ?? '';
    const rawText = await res.text();

    // Step 4: Convert HTML -> Plain Text
    const selectorsToDiscard: string[] = ['nav', 'header', 'footer', 'script', 'style', 'meta', 'link'];
    // If its HTML, we convert it to text otherwise text is the raw response (For other responses like pdfs etc.)
    const pageContent = contentType.includes('text/html') ? convert(rawText, {
        wordwrap: false,
        selectors: selectorsToDiscard.map(selector => ({ selector, format: 'skip' })),
    }) : rawText;
    // Step 5: Clean the extra white spaces & cap the text limit to 8000 chars
    const cleanedPageContent = pageContent.replace(/s+/g, ' ').trim();
    const clippedPageContent = clip(cleanedPageContent, 8000);

    logger.debug(`openUrl: Content fetched for URL: ${normalizedUrl}`);
    return openUrlOutputSchema.parse({
        url: normalizedUrl,
        content: clippedPageContent,
    });
}
