import { ChatOpenAI, ChatOpenAIFields } from "@langchain/openai";
import { env } from "./env.js";

export function createOpenAILLM(model: string, overrides: Partial<ChatOpenAIFields> = {}): any {
    return new ChatOpenAI(model, {
        apiKey: env.OPENAI_API_KEY,
        temperature: 0,
        ...overrides
    });
}
