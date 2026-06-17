import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { calculateUsageTotals } from "./fileService";
import type { OperationRun } from "../types";

function run(patch: Partial<OperationRun>): OperationRun {
  return {
    runId: patch.runId || randomUUID(),
    operation: patch.operation || "document_generation",
    scope: patch.scope || "document",
    provider: patch.provider ?? "openai",
    model: patch.model ?? "gpt-test",
    promptId: patch.promptId ?? "prompt",
    diagramPromptId: patch.diagramPromptId ?? null,
    diagramType: patch.diagramType ?? null,
    startedAt: patch.startedAt || "2026-05-23T00:00:00.000Z",
    finishedAt: patch.finishedAt || "2026-05-23T00:00:01.000Z",
    durationMs: patch.durationMs ?? 1000,
    inputTokens: "inputTokens" in patch ? patch.inputTokens! : 10,
    outputTokens: "outputTokens" in patch ? patch.outputTokens! : 5,
    totalTokens: "totalTokens" in patch ? patch.totalTokens! : 15,
    usageSource: patch.usageSource || "provider_reported"
  };
}

test("aggregates document, diagram and transcript runs separately", () => {
  const totals = calculateUsageTotals([
    run({ operation: "yt_dlp_info", scope: "transcript", provider: null, model: null, inputTokens: 0, outputTokens: 0, totalTokens: 0, durationMs: 250 }),
    run({ operation: "chunk_summary", scope: "document", inputTokens: 100, outputTokens: 20, totalTokens: 120, durationMs: 1000 }),
    run({ operation: "document_generation", scope: "document", inputTokens: 80, outputTokens: 30, totalTokens: 110, durationMs: 2000 }),
    run({ operation: "diagram_generation", scope: "diagram", diagramType: "flowchart", inputTokens: 50, outputTokens: 10, totalTokens: 60, durationMs: 500 })
  ]);

  assert.equal(totals.transcript.durationMs, 250);
  assert.equal(totals.document.totalTokens, 230);
  assert.equal(totals.document.durationMs, 3000);
  assert.equal(totals.diagrams.totalTokens, 60);
  assert.equal(totals.all.totalTokens, 290);
  assert.equal(totals.all.durationMs, 3750);
});

test("does not estimate unavailable usage in totals", () => {
  const totals = calculateUsageTotals([
    run({
      usageSource: "unavailable",
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      durationMs: 700
    })
  ]);

  assert.equal(totals.document.inputTokens, 0);
  assert.equal(totals.document.outputTokens, 0);
  assert.equal(totals.document.totalTokens, 0);
  assert.equal(totals.document.durationMs, 700);
  assert.equal(totals.document.unavailableUsageRuns, 1);
});
