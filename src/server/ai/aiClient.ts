import { generateGoogleText } from "./providers/google";
import { generateNanoGPTText } from "./providers/nanogpt";
import { generateOpenAIText } from "./providers/openai";
import type { GenerateTextInput, GenerateTextResult } from "../types";

function now() {
  return new Date().toISOString();
}

async function withTiming<T extends { text: string; usage: GenerateTextResult["usage"] }>(callback: () => Promise<T>): Promise<GenerateTextResult> {
  const startedAt = now();
  const startMs = Date.now();
  try {
    const result = await callback();
    const finishedAt = now();
    return {
      text: result.text,
      usage: result.usage,
      timing: {
        startedAt,
        finishedAt,
        durationMs: Math.max(0, Date.now() - startMs)
      }
    };
  } catch (error) {
    throw error;
  }
}

export async function generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
  if (input.provider === "openai") {
    return withTiming(() => generateOpenAIText(input));
  }

  if (input.provider === "google") {
    return withTiming(() => generateGoogleText(input));
  }

  return withTiming(() => generateNanoGPTText(input));
}
