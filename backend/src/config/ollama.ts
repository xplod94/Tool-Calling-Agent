import { ChatOllama, ChatOllamaInput } from "@langchain/ollama";
import { env } from "./env.js";

export function createOllamaLLM(model: string, overrides: Partial<ChatOllamaInput> = {}): ChatOllama {
    return new ChatOllama({
        model,
        baseUrl: env.OLLAMA_BASE_URL,
        temperature: env.OLLAMA_TEMPERATURE,
        numCtx: env.OLLAMA_NUM_CTX,
        keepAlive: -1, // Keeps the model in VRAM until explicitly unloaded [Unloading is part of graceful shutdown]
        ...overrides
    });
}
