import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGeminiUsage, normalizeNanoGPTUsage, normalizeOpenAIUsage, unavailableUsage } from "./usage";
import { extractOpenAIText } from "./providers/openai";

test("normalizes OpenAI response usage", () => {
  const usage = normalizeOpenAIUsage({
    input_tokens: 100,
    output_tokens: 20,
    total_tokens: 120,
    input_tokens_details: { cached_tokens: 10 },
    output_tokens_details: { reasoning_tokens: 4 }
  });

  assert.equal(usage.inputTokens, 100);
  assert.equal(usage.outputTokens, 20);
  assert.equal(usage.totalTokens, 120);
  assert.equal(usage.cachedInputTokens, 10);
  assert.equal(usage.reasoningTokens, 4);
  assert.equal(usage.source, "provider_reported");
});

test("normalizes Gemini response usage", () => {
  const usage = normalizeGeminiUsage({
    promptTokenCount: 300,
    candidatesTokenCount: 80,
    totalTokenCount: 390,
    cachedContentTokenCount: 30,
    thoughtsTokenCount: 10
  });

  assert.equal(usage.inputTokens, 300);
  assert.equal(usage.outputTokens, 80);
  assert.equal(usage.totalTokens, 390);
  assert.equal(usage.cachedInputTokens, 30);
  assert.equal(usage.reasoningTokens, 10);
  assert.equal(usage.source, "provider_reported");
});

test("normalizes Nano-GPT response usage", () => {
  const usage = normalizeNanoGPTUsage({
    prompt_tokens: 500,
    completion_tokens: 120,
    total_tokens: 620,
    prompt_tokens_details: { cached_tokens: 40 },
    completion_tokens_details: { reasoning_tokens: 9 }
  });

  assert.equal(usage.inputTokens, 500);
  assert.equal(usage.outputTokens, 120);
  assert.equal(usage.totalTokens, 620);
  assert.equal(usage.cachedInputTokens, 40);
  assert.equal(usage.reasoningTokens, 9);
  assert.equal(usage.source, "provider_reported");
});

test("marks missing usage as unavailable", () => {
  assert.deepEqual(unavailableUsage(), {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    source: "unavailable"
  });
  assert.equal(normalizeOpenAIUsage().source, "unavailable");
  assert.equal(normalizeGeminiUsage().source, "unavailable");
  assert.equal(normalizeNanoGPTUsage().source, "unavailable");
});

test("extracts OpenAI text from output_text", () => {
  assert.equal(extractOpenAIText({ output_text: "  Documento listo  " }), "Documento listo");
});

test("extracts OpenAI text from output content array", () => {
  const text = extractOpenAIText({
    output: [
      {
        type: "message",
        content: [
          { type: "output_text", text: "Parte 1" },
          { type: "output_text", text: "Parte 2" }
        ]
      }
    ]
  });

  assert.equal(text, "Parte 1\nParte 2");
});
