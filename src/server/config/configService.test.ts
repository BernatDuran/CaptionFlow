import assert from "node:assert/strict";
import test from "node:test";
import { getAdaptiveChunkSizeChars, getChunkSizeChars, getDynamicMaxTranscriptChars } from "./configService";
import type { LocalSettings } from "../types";

function settings(patch: Partial<LocalSettings> = {}): LocalSettings {
  return {
    activeProvider: "openai",
    selectedModels: { openai: "gpt-test" },
    adaptiveChunkingEnabled: false,
    minimumModelContextTokens: 4000,
    ...patch
  };
}

test("uses dynamic model context tokens for safe transcript size", () => {
  assert.equal(getDynamicMaxTranscriptChars("nanogpt", "unknown-model", 128000), Math.floor(128000 * 4 * 0.85));
});

test("keeps legacy chunk size when adaptive chunking is disabled", () => {
  assert.equal(getAdaptiveChunkSizeChars(settings(), "openai", "gpt-test", 128000), getChunkSizeChars());
});

test("calculates smaller adaptive chunks for small-context models", () => {
  assert.equal(getAdaptiveChunkSizeChars(settings({ adaptiveChunkingEnabled: true }), "openai", "gpt-test", 4000), 9600);
});

test("caps adaptive chunks for large-context models", () => {
  assert.equal(getAdaptiveChunkSizeChars(settings({ adaptiveChunkingEnabled: true }), "openai", "gpt-test", 128000), 80000);
});
