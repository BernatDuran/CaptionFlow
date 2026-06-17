import { AppError, type GenerateTextInput } from "../../types";
import { getApiKey } from "../../config/configService";
import { normalizeOpenAIUsage, type OpenAIUsagePayload } from "../usage";

type OpenAIResponse = {
  output_text?: string;
  status?: string;
  incomplete_details?: {
    reason?: string;
  };
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string | null;
    }>;
  }>;
  usage?: OpenAIUsagePayload;
  error?: { message?: string };
};

export function extractOpenAIText(data: OpenAIResponse) {
  const outputText = data.output_text?.trim();
  if (outputText) return outputText;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text" || typeof part.text === "string")
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

function getEmptyOpenAIMessage(data: OpenAIResponse) {
  if (data.status === "incomplete") {
    const reason = data.incomplete_details?.reason ? ` Motivo: ${data.incomplete_details.reason}.` : "";
    return `OpenAI no devolvio texto final porque la respuesta quedo incompleta.${reason}`;
  }

  const outputTypes = (data.output || []).map((item) => item.type).filter(Boolean);
  if (outputTypes.length > 0) {
    return `OpenAI respondio correctamente, pero CaptionFlow no encontro contenido de texto extraible. Tipos recibidos: ${outputTypes.join(", ")}.`;
  }

  return "OpenAI respondio correctamente, pero no devolvio contenido de texto.";
}

export async function generateOpenAIText(input: GenerateTextInput) {
  const apiKey = getApiKey("openai");
  if (!apiKey) {
    throw new AppError("API_KEY_MISSING", "Falta OPENAI_API_KEY en .env.", 400);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: input.model,
      input: input.prompt,
      temperature: input.temperature
    })
  });

  const data = (await response.json().catch(() => ({}))) as OpenAIResponse;
  if (!response.ok) {
    throw new AppError("AI_PROVIDER_ERROR", data.error?.message || "OpenAI no pudo procesar la solicitud.", 502);
  }

  const text = extractOpenAIText(data);
  if (!text) {
    throw new AppError("EMPTY_AI_RESPONSE", getEmptyOpenAIMessage(data), 502);
  }

  return {
    text,
    usage: normalizeOpenAIUsage(data.usage)
  };
}
