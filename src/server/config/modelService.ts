import { MODEL_CATALOG } from "./modelCatalog";
import { getApiKey } from "./configService";
import { getOpenAILimits } from "./openaiModelLimits";
import type { ModelDefinition, ProviderId } from "../types";

type OpenAICompatibleModelsResponse = {
  data?: Array<{ id?: string; name?: string; context_length?: number; max_output_tokens?: number }>;
};

type GeminiModelsResponse = {
  models?: Array<{
    name?: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
    inputTokenLimit?: number;
    outputTokenLimit?: number;
  }>;
};

const MODEL_FETCH_TIMEOUT_MS = 3500;

function withTimeout() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_FETCH_TIMEOUT_MS);
  return { controller, timeout };
}

function toLabel(id: string) {
  return id
    .replace(/^models\//, "")
    .replace(/[._/-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sortModels(models: ModelDefinition[]) {
  return [...models].sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
}

function isLikelyTextGenerationModel(id: string) {
  if (!/^(gpt|o[0-9])/i.test(id)) return false;
  if (/(image|audio|realtime|transcribe|tts|whisper|search)/i.test(id)) return false;
  return true;
}

async function fetchOpenAIModels(): Promise<ModelDefinition[]> {
  const apiKey = getApiKey("openai");
  if (!apiKey) return sortModels(MODEL_CATALOG.openai);

  const { controller, timeout } = withTimeout();
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal
    });
    const data = (await response.json().catch(() => ({}))) as OpenAICompatibleModelsResponse;
    if (!response.ok || !Array.isArray(data.data)) return sortModels(MODEL_CATALOG.openai);

    const models = data.data
      .map((model) => model.id || model.name)
      .filter((id): id is string => Boolean(id))
      .filter(isLikelyTextGenerationModel)
      .map((id) => ({ id, label: toLabel(id), limits: getOpenAILimits(id) }));

    return models.length > 0 ? sortModels(models) : sortModels(MODEL_CATALOG.openai);
  } catch {
    return sortModels(MODEL_CATALOG.openai);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNanoGPTModels(): Promise<ModelDefinition[]> {
  const apiKey = getApiKey("nanogpt");
  if (!apiKey) return sortModels(MODEL_CATALOG.nanogpt);

  const { controller, timeout } = withTimeout();
  try {
    const response = await fetch("https://nano-gpt.com/api/subscription/v1/models?detailed=true", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal
    });
    const data = (await response.json().catch(() => ({}))) as OpenAICompatibleModelsResponse;
    if (!response.ok || !Array.isArray(data.data)) return MODEL_CATALOG.nanogpt;

    const models = data.data
      .filter((model) => Boolean(model.id || model.name))
      .map((model) => {
        const id = (model.id || model.name) as string;
        return {
          id,
          label: toLabel(id),
          limits: {
            provider: "nanogpt" as const,
            modelId: id,
            maxInputTokens: typeof model.context_length === "number" ? model.context_length : null,
            maxOutputTokens: typeof model.max_output_tokens === "number" ? model.max_output_tokens : null,
            source: "api" as const,
            lastUpdated: new Date().toISOString()
          }
        };
      });

    return models.length > 0 ? sortModels(models) : sortModels(MODEL_CATALOG.nanogpt);
  } catch {
    return sortModels(MODEL_CATALOG.nanogpt);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGeminiModels(): Promise<ModelDefinition[]> {
  const apiKey = getApiKey("google");
  if (!apiKey) return sortModels(MODEL_CATALOG.google);

  const { controller, timeout } = withTimeout();
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {
      signal: controller.signal
    });
    const data = (await response.json().catch(() => ({}))) as GeminiModelsResponse;
    if (!response.ok || !Array.isArray(data.models)) return MODEL_CATALOG.google;

    const models = data.models
      .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
      .filter((model) => Boolean(model.name))
      .map((model) => {
        const id = (model.name as string).replace(/^models\//, "");
        return {
          id,
          label: toLabel(id),
          limits: {
            provider: "gemini" as const,
            modelId: id,
            maxInputTokens: typeof model.inputTokenLimit === "number" ? model.inputTokenLimit : null,
            maxOutputTokens: typeof model.outputTokenLimit === "number" ? model.outputTokenLimit : null,
            source: "api" as const,
            lastUpdated: new Date().toISOString()
          }
        };
      });

    return models.length > 0 ? sortModels(models) : sortModels(MODEL_CATALOG.google);
  } catch {
    return sortModels(MODEL_CATALOG.google);
  } finally {
    clearTimeout(timeout);
  }
}

export async function listModels(provider: ProviderId): Promise<ModelDefinition[]> {
  if (provider === "nanogpt") {
    return fetchNanoGPTModels();
  }

  if (provider === "google") {
    return fetchGeminiModels();
  }

  return fetchOpenAIModels();
}
