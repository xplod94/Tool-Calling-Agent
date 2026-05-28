import { z } from 'zod';
import dotenv from 'dotenv';
import { EEnvironments, ELoggerFormat, ELoggerLevel, EModelProviders, ERouteStrategies, ERunMode } from '@/common/Enums.js';

dotenv.config();

const envSchema = z.object({
    // Server
    NODE_ENV: z.enum(EEnvironments).default(EEnvironments.development),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default('localhost'),
    RUN_MODE: z.enum(ERunMode).default(ERunMode.no_debug),

    // AI Model
    MODEL_PROVIDER: z.enum(EModelProviders).default(EModelProviders.ollama),
    // Open AI
    OPENAI_API_KEY: z.string().default(''),
    OPENAI_MODEL: z.string().default('gpt-5.4-mini'),
    // Google
    GOOGLE_API_KEY: z.string().default(''),
    GOOGLE_MODEL: z.string().default('gemma-4-31b-it'),
    // Groq
    GROQ_API_KEY: z.string().default(''),
    GROQ_MODEL: z.string().default('groq/compound'),
    // Ollama
    OLLAMA_BASE_URL: z.url().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().default('qwen3.5:4b'),
    OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
    OLLAMA_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
    OLLAMA_NUM_CTX: z.coerce.number().int().positive().default(4096),
    // Tavily
    TAVILY_API_KEY: z.string().default(''),
    TAVILY_MAX_RESULTS: z.number().default(10),
    // Search
    ROUTE_STRATEGY: z.enum(ERouteStrategies).default(ERouteStrategies.basic),

    // Agent
    AGENT_MAX_ITERATIONS: z.coerce.number().int().positive().default(10),
    AGENT_VERBOSE: z
        .string()
        .transform((v) => v === 'true')
        .default(false),

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(60),

    // Logging
    LOG_LEVEL: z.enum(ELoggerLevel).default(ELoggerLevel.debug),
    LOG_FORMAT: z.enum(ELoggerFormat).default(ELoggerFormat.pretty),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:4200'),
});

console.info('Trying to safely parse the environment variables');
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:\n', JSON.stringify(parsed.error));
    process.exit(1);
}

console.info('Environment variables set');
export const env = parsed.data;
export type Env = typeof env;

// Returns flag to check if the app is running in debug mode
// In debug mode some API calls are not made and return dummy data to save on API token costs
export const isDebugMode = (): boolean => {
    return env.NODE_ENV === EEnvironments.development && env.RUN_MODE === ERunMode.debug;
}
