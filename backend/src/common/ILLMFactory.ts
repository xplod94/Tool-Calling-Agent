import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage } from "langchain";

export type Normalizer = (response: BaseMessage) => string;
export type GoogleContentPart = {
    type: "text" | "reasoning" | string;
    text?: string;
};

export interface LLMInstance {
    llm: BaseChatModel;
    normalizer: Normalizer;
}
export type ProviderFactory = (model: string, overrides: any) => LLMInstance;
