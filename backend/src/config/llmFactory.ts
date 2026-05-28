import { EModelProviders } from "@/common/Enums.js";
import { createOllamaLLM } from "./ollama.js";
import { createGoogleLLM } from "./google.js";
import { createGroqLLM } from "./groq.js";
import { createOpenAILLM } from "./openai.js";
import { BaseMessage } from "langchain";
import { logger } from "@/utils/logger.js";
import { GoogleContentPart, LLMInstance, Normalizer, ProviderFactory } from "@/common/ILLMFactory.js";
import { env } from "./env.js";
import { PROVIDER_MODEL_MAP } from "@/common/Constants.js";

// ---- Normalizers ----
const normalizers: Record<EModelProviders, Normalizer> = {
    [EModelProviders.ollama]: (response: BaseMessage): string => {
        // Ollama returns content as a plain string
        return response.content as string;
    },
    [EModelProviders.google]: (response: BaseMessage): string => {
        // Google returns an array; filter to only 'text' type parts and join them
        const parts = Array.isArray(response.content)
            ? (response.content as GoogleContentPart[])
            : [{ type: 'text', text: response.content as string }];

        return parts
            .filter((part) => part.type === 'text')
            .map((part) => part.text ?? '')
            .join('');
    },
    [EModelProviders.groq]: (response: BaseMessage): string => {
        // Groq mirrors OpenAI format — content is a plain string
        return response.content as string;
    },
    [EModelProviders.openai]: (response: BaseMessage): string => {
        // OpenAI returns content as a plain string
        return response.content as string;
    },
};

// ---- Provider config builders ----
const providerConfigs: Record<EModelProviders, ProviderFactory> = {
    [EModelProviders.ollama]: (model: string, overrides: any): LLMInstance => ({
        llm: createOllamaLLM(model, overrides),
        normalizer: normalizers[EModelProviders.ollama],
    }),
    [EModelProviders.google]: (model: string, overrides: any): LLMInstance => ({
        llm: createGoogleLLM(model, overrides),
        normalizer: normalizers[EModelProviders.google],
    }),
    [EModelProviders.groq]: (model: string, overrides: any): LLMInstance => ({
        llm: createGroqLLM(model, overrides),
        normalizer: normalizers[EModelProviders.groq],
    }),
    [EModelProviders.openai]: (model: string, overrides: any): LLMInstance => ({
        llm: createOpenAILLM(model, overrides),
        normalizer: normalizers[EModelProviders.openai],
    }),
};

// ---- Factory ----
export const createLLM = (
    overrides: any = {},
    modelProvider: EModelProviders = env.MODEL_PROVIDER,
    model: string = PROVIDER_MODEL_MAP[env.MODEL_PROVIDER]
): LLMInstance => {
    if (!(modelProvider in providerConfigs)) {
        logger.error(`createLLM: Unsupported LLM_PROVIDER: ${modelProvider}. `);
        throw new Error(
            `Unsupported LLM_PROVIDER: ${modelProvider}. ` +
            `Choose from: ${Object.keys(providerConfigs).join(', ')}`
        );
    }

    logger.debug(`createLLM: LLM Instance created: ${model} from ${modelProvider}`);
    return providerConfigs[modelProvider](model, overrides);
}
