import { AppError, type GenerateTextInput } from "../../types";
import { getApiKey } from "../../config/configService";
import { normalizeNanoGPTUsage, type NanoGPTUsagePayload } from "../usage";

type NanoGPTResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: NanoGPTUsagePayload;
  error?: { message?: string } | string;
};

const NANOGPT_TIMEOUT_MS = Number(process.env.NANOGPT_TIMEOUT_MS || 180000);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNetworkErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return "Nano-GPT ha tardado demasiado en responder. Prueba con otro modelo o con una transcripcion mas corta.";
  }

  if (error instanceof Error) {
    return `No se pudo conectar con Nano-GPT (${error.message}). Revisa conexion, firewall/proxy o disponibilidad temporal del proveedor.`;
  }

  return "No se pudo conectar con Nano-GPT. Revisa conexion, firewall/proxy o disponibilidad temporal del proveedor.";
}

async function postNanoGPTCompletion(input: GenerateTextInput) {
  const apiKey = getApiKey("nanogpt");
  if (!apiKey) {
    throw new AppError("API_KEY_MISSING", "Falta NANOGPT_API_KEY o NANO_GPT_API_KEY en .env.", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NANOGPT_TIMEOUT_MS);

  try {
    return await fetch("https://nano-gpt.com/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: input.model,
        messages: [{ role: "user", content: input.prompt }],
        temperature: input.temperature,
        include_usage: true,
        stream: false
      })
    });
  } catch (error) {
    throw new AppError("AI_PROVIDER_ERROR", getNetworkErrorMessage(error), 502);
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateNanoGPTText(input: GenerateTextInput) {
  let response: Response;
  try {
    response = await postNanoGPTCompletion(input);
  } catch (error) {
    if (error instanceof AppError && error.code === "AI_PROVIDER_ERROR") {
      await wait(900);
      response = await postNanoGPTCompletion(input);
    } else {
      throw error;
    }
  }

  if (response.status === 408 || response.status === 429 || response.status >= 500) {
    await wait(900);
    response = await postNanoGPTCompletion(input);
  }

  const data = (await response.json().catch(() => ({}))) as NanoGPTResponse;
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : data.error?.message;
    throw new AppError("AI_PROVIDER_ERROR", message || "Nano-GPT no pudo procesar la solicitud.", 502);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new AppError("EMPTY_AI_RESPONSE", "Nano-GPT devolvió una respuesta vacía.", 502);
  }

  return {
    text,
    usage: normalizeNanoGPTUsage(data.usage)
  };
}
