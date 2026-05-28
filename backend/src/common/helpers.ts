import { logger } from "@/utils/logger.js";

/**
 * Clips the text to the desired max length
 * 
 * @param text - The text to clip
 * @param maxLength - The maximum length of the text
 * @returns The clipped text
 */
export const clip = (text: string, maxLength: number): string => text.length <= maxLength ? text : text.slice(0, maxLength);

/**
 * Validates a URL string by parsing it using URL constructor
 * 
 * @param url - The URL string to validate
 * @returns The normalized URL if valid, throws an error otherwise
 */
export const validateUrl = (url: string): string => {
    try {
        const parsedUrl = new URL(`${url}`);
        return parsedUrl.toString();
    } catch {
        logger.error(`Invalid URL: ${url}`);
        throw new Error('Invalid URL');
    }
}

/**
 * Safely extracts text content from a response, attempting to parse as JSON
 * and falling back to a default message if parsing fails.
 * 
 * @param res - The HTTP response object
 * @returns The parsed JSON object if successful, '<no body>' otherwise
 */
export const safeText = async (res: Response): Promise<any> => {
    try {
        return await res.json();
    } catch {
        return '<no body>';
    }
}
