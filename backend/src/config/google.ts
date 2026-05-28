import { ChatGoogle, ChatGoogleParams } from "@langchain/google";
import { env } from "./env.js";

export function createGoogleLLM(model: string, overrides: Partial<ChatGoogleParams> = {}): ChatGoogle {
    return new ChatGoogle(model, {
        apiKey: env.GOOGLE_API_KEY,
        temperature: 0,
        ...overrides
    });
}
