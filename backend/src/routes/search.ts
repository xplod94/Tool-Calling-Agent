import { routerInputSchema } from "@/config/routerSchema.js";
import { runSearch } from "@/search_tool/searchChain.js";
import { logger } from "@/utils/logger.js";
import { Router } from "express";

export const searchRouter = Router();

searchRouter.post('/', async (_req, res) => {
    try {
        const input = routerInputSchema.parse(_req.body);
        logger.debug(`/search -> user input parsed: ${JSON.stringify(input)}`);
        const result = await runSearch(input);
        logger.info(`/search -> Search result created successfully: ${JSON.stringify(result)}`);
        res.status(200).json(result);
    } catch (e) {
        const errorMessage = (e as Error)?.message ?? 'Unknown Error';
        logger.error(`/search -> ${errorMessage}`, e);
        res.status(400).json({ error: errorMessage });
    }
});
