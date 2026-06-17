import type { GenerateTextUsage } from "../types";

export type OpenAIUsagePayload = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  input_tokens_details?: {
    cached_tokens?: number;
  };
  output_tokens_details?: {
    reasoning_tokens?: number;
  };
};

export type GeminiUsagePayload = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  cachedContentTokenCount?: number;
  thoughtsTokenCount?: number;
};

export type NanoGPTUsagePayload = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cache_read_input_tokens?: number;
  reasoning_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
};

export function unavailableUsage(): GenerateTextUsage {
  return {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    source: "unavailable"
  };
}

export function normalizeOpenAIUsage(usage?: OpenAIUsagePayload): GenerateTextUsage {
  if (!usage) return unavailableUsage();

  return {
    inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : null,
    outputTokens: typeof usage.output_tokens === "number" ? usage.output_tokens : null,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : null,
    cachedInputTokens: usage.input_tokens_details?.cached_tokens,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens,
    source: "provider_reported",
    rawUsage: usage
  };
}

export function normalizeGeminiUsage(usage?: GeminiUsagePayload): GenerateTextUsage {
  if (!usage) return unavailableUsage();

  return {
    inputTokens: typeof usage.promptTokenCount === "number" ? usage.promptTokenCount : null,
    outputTokens: typeof usage.candidatesTokenCount === "number" ? usage.candidatesTokenCount : null,
    totalTokens: typeof usage.totalTokenCount === "number" ? usage.totalTokenCount : null,
    cachedInputTokens: usage.cachedContentTokenCount,
    reasoningTokens: usage.thoughtsTokenCount,
    source: "provider_reported",
    rawUsage: usage
  };
}

export function normalizeNanoGPTUsage(usage?: NanoGPTUsagePayload): GenerateTextUsage {
  if (!usage) return unavailableUsage();

  return {
    inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : null,
    outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : null,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : null,
    cachedInputTokens: usage.prompt_tokens_details?.cached_tokens ?? usage.cache_read_input_tokens,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? usage.reasoning_tokens,
    source: "provider_reported",
    rawUsage: usage
  };
}
