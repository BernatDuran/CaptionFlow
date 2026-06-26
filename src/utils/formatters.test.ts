import assert from "node:assert/strict";
import test from "node:test";
import { formatModelDisplayId, formatTokenLimitSummary, formatTokens, formatWords, getMonthKey } from "./formatters";

test("formats Nano-GPT model display ids without provider prefix", () => {
  assert.equal(formatModelDisplayId("vendor/model-a", "nanogpt"), "model-a");
});

test("keeps non Nano-GPT model ids lowercased", () => {
  assert.equal(formatModelDisplayId("GPT-4.1-MINI", "openai"), "gpt-4.1-mini");
});

test("formats token and word summaries", () => {
  assert.equal(formatTokens(14500), "15k tok");
  assert.equal(formatTokenLimitSummary(128000), "[128k tok]");
  assert.equal(formatWords(7197), "7.197 pal.");
});

test("extracts month keys from ISO dates", () => {
  assert.equal(getMonthKey("2026-06-24T10:30:00.000Z"), "2026-06");
});
