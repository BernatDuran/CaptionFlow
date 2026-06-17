import { AppError, type GenerateTextInput } from "../../types";
import { getApiKey } from "../../config/configService";
import { normalizeGeminiUsage, type GeminiUsagePayload } from "../usage";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: GeminiUsagePayload;
  error?: { message?: string };
};

export async function generateGoogleText(input: GenerateTextInput) {
  const apiKey = getApiKey("google");
  if (!apiKey) {
    throw new AppError("API_KEY_MISSING", "Falta GOOGLE_API_KEY o GEMINI_API_KEY en .env.", 400);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    input.model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      generationConfig: {
        temperature: input.temperature
      }
    })
  });

  const data = (await response.json().catch(() => ({}))) as GeminiResponse;
  if (!response.ok) {
    throw new AppError("AI_PROVIDER_ERROR", data.error?.message || "Google Gemini no pudo procesar la solicitud.", 502);
  }

  const text = data.candidates?.flatMap((candidate) => candidate.content?.parts || []).map((part) => part.text || "").join("\n").trim();
  if (!text) {
    throw new AppError("EMPTY_AI_RESPONSE", "Google Gemini devolvió una respuesta vacía.", 502);
  }

  return {
    text,
    usage: normalizeGeminiUsage(data.usageMetadata)
  };
}
