import { ChatGroq, ChatGroqInput } from "@langchain/groq"
import { env } from "./env.js";

export function createGroqLLM(model: string, overrides: Partial<ChatGroqInput> = {}): ChatGroq {
    return new ChatGroq(model, {
        temperature: 0,
        apiKey: env.GROQ_API_KEY,
        ...overrides
    });
}
