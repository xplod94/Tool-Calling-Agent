import { env } from "@/config/env.js";
import { EModelProviders } from "./Enums.js";

export const PROVIDER_MODEL_MAP: Record<EModelProviders, string> = {
    [EModelProviders.ollama]: env.OLLAMA_MODEL,
    [EModelProviders.google]: env.GOOGLE_MODEL,
    [EModelProviders.openai]: env.OPENAI_MODEL,
    [EModelProviders.groq]: env.GROQ_MODEL,
};
