import type { ModelTokenLimits } from "../types";

const MANUAL_REGISTRY: Record<string, Omit<ModelTokenLimits, "provider" | "modelId" | "source" | "lastUpdated">> = {
  "gpt-4o": { maxInputTokens: 128000, maxOutputTokens: 4096 },
  "gpt-4o-2024-05-13": { maxInputTokens: 128000, maxOutputTokens: 4096 },
  "gpt-5.1-chat-latest": { maxInputTokens: 128000, maxOutputTokens: 16384 },
  "gpt-5-pro": { maxInputTokens: 400000, maxOutputTokens: 272000 },
  "gpt-5-nano": { maxInputTokens: 400000, maxOutputTokens: 128000 },
  "gpt-5-mini": { maxInputTokens: 400000, maxOutputTokens: 128000 },
  "gpt-5-codex": { maxInputTokens: 400000, maxOutputTokens: 128000 },
  "gpt-5-chat-latest": { maxInputTokens: 128000, maxOutputTokens: 16384 },
  "gpt-5.5": { maxInputTokens: 1050000, maxOutputTokens: 128000 },
  "gpt-5.5-pro": { maxInputTokens: 1050000, maxOutputTokens: 128000 },
  "gpt-5.4": { maxInputTokens: 1050000, maxOutputTokens: 128000 },
  "gpt-5.4-pro": { maxInputTokens: 1050000, maxOutputTokens: 128000 },
  "gpt-5.4-nano": { maxInputTokens: 400000, maxOutputTokens: 128000 },
  "gpt-5.3-codex": { maxInputTokens: 400000, maxOutputTokens: 128000 },
  "gpt-5.2": { maxInputTokens: 400000, maxOutputTokens: 128000 },
  "gpt-5.2-chat-latest": { maxInputTokens: 128000, maxOutputTokens: 16384 },
  "gpt-4o-2024-08-06": { maxInputTokens: 128000, maxOutputTokens: 16384 },
  "gpt-4o-2024-11-20": { maxInputTokens: 128000, maxOutputTokens: 16384 },
  "gpt-4o-mini": { maxInputTokens: 128000, maxOutputTokens: 16384 },
  "gpt-4o-mini-2024-07-18": { maxInputTokens: 128000, maxOutputTokens: 16384 },
  "o3-mini": { maxInputTokens: 200000, maxOutputTokens: 100000 },
  "o3-mini-2025-01-31": { maxInputTokens: 200000, maxOutputTokens: 100000 },
  "o1": { maxInputTokens: 200000, maxOutputTokens: 100000 },
  "o1-2024-12-17": { maxInputTokens: 200000, maxOutputTokens: 100000 },
  "o1-preview": { maxInputTokens: 128000, maxOutputTokens: 32768 },
  "o1-preview-2024-09-12": { maxInputTokens: 128000, maxOutputTokens: 32768 },
  "o1-mini": { maxInputTokens: 128000, maxOutputTokens: 65536 },
  "o1-mini-2024-09-12": { maxInputTokens: 128000, maxOutputTokens: 65536 },
  "chatgpt-4o-latest": { maxInputTokens: 128000, maxOutputTokens: 16384 },
  "gpt-4-turbo": { maxInputTokens: 128000, maxOutputTokens: 4096 },
  "gpt-4-turbo-2024-04-09": { maxInputTokens: 128000, maxOutputTokens: 4096 },
  "gpt-4-turbo-preview": { maxInputTokens: 128000, maxOutputTokens: 4096 },
  "gpt-4-0125-preview": { maxInputTokens: 128000, maxOutputTokens: 4096 },
  "gpt-4-1106-preview": { maxInputTokens: 128000, maxOutputTokens: 4096 },
  "gpt-4": { maxInputTokens: 8192, maxOutputTokens: 8192 },
  "gpt-4-0613": { maxInputTokens: 8192, maxOutputTokens: 8192 },
  "gpt-4-32k": { maxInputTokens: 32768, maxOutputTokens: 8192 },
  "gpt-4-32k-0613": { maxInputTokens: 32768, maxOutputTokens: 8192 },
  "gpt-3.5-turbo": { maxInputTokens: 16385, maxOutputTokens: 4096 },
  "gpt-3.5-turbo-0125": { maxInputTokens: 16385, maxOutputTokens: 4096 },
  "gpt-3.5-turbo-1106": { maxInputTokens: 16385, maxOutputTokens: 4096 },
  "gpt-3.5-turbo-instruct": { maxInputTokens: 4096, maxOutputTokens: 4096 },
};

export function getOpenAILimits(modelId: string): ModelTokenLimits {
  const manual = MANUAL_REGISTRY[modelId];

  if (manual) {
    return {
      provider: "openai",
      modelId,
      maxInputTokens: manual.maxInputTokens,
      maxOutputTokens: manual.maxOutputTokens,
      source: "manual",
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    provider: "openai",
    modelId,
    maxInputTokens: null,
    maxOutputTokens: null,
    source: "unknown",
    lastUpdated: new Date().toISOString(),
  };
}
