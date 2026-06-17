import type { ModelDefinition, ProviderId } from "../types";

export const MODEL_CATALOG: Record<ProviderId, ModelDefinition[]> = {
  openai: [
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", contextTokens: 128000 },
    { id: "gpt-4.1", label: "GPT-4.1", contextTokens: 128000 },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", contextTokens: 128000 }
  ],
  google: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", contextTokens: 1000000 },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", contextTokens: 1000000 },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", contextTokens: 2000000 }
  ],
  nanogpt: [
    { id: "qwen/qwen3.5-397b-a17b", label: "Qwen 3.5 397B A17B", contextTokens: 32000 },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", contextTokens: 128000 },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", contextTokens: 1000000 }
  ]
};

export const PROVIDERS: Array<{ id: ProviderId; name: string }> = [
  { id: "openai", name: "OpenAI" },
  { id: "google", name: "Google Gemini" },
  { id: "nanogpt", name: "Nano-GPT" }
];
