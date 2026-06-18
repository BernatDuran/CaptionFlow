import assert from "node:assert/strict";
import test from "node:test";
import { aggregateByDimension, facetOptions, filterRecords, safeDivide } from "./analyticsUtils";
import type { AnalyticsRecord } from "../shared/analytics";

function record(patch: Partial<AnalyticsRecord>): AnalyticsRecord {
  return {
    filename: "a.md",
    title: "A",
    videoTitle: "Video A",
    videoUrl: null,
    channelName: "Canal A",
    provider: "openai",
    model: "gpt-a",
    promptName: "Resumen",
    artifactType: "all",
    hasDiagram: false,
    diagramCount: 0,
    diagramKinds: [],
    processedAt: "2026-06-18T10:00:00.000Z",
    month: "2026-06",
    transcriptLanguage: "es",
    transcriptSource: "official",
    chunked: false,
    totalTokens: 100,
    inputTokens: 80,
    outputTokens: 20,
    processingDurationMs: 1000,
    videoDurationSeconds: 60,
    transcriptWords: 100,
    outputWords: 30,
    documentCount: 1,
    tokensPerVideoMinute: 100,
    tokensPerInputWord: 1,
    tokensPerOutputWord: 100 / 30,
    processingSecondsPerVideoMinute: 1,
    outputWordsPerInputWord: 0.3,
    unavailableUsageRuns: 0,
    ...patch
  };
}

test("safeDivide protects generated ratios", () => {
  assert.equal(safeDivide(4, 2), 2);
  assert.equal(safeDivide(4, 0), null);
  assert.equal(safeDivide(null, 2), null);
});

test("filters records by selected dimensions", () => {
  const records = [
    record({ filename: "a.md", channelName: "Canal A", provider: "openai" }),
    record({ filename: "b.md", channelName: "Canal B", provider: "google" })
  ];

  assert.deepEqual(filterRecords(records, { channelName: "Canal B" }).map((item) => item.filename), ["b.md"]);
});

test("builds facet options excluding the active facet key", () => {
  const records = [
    record({ channelName: "Canal A", provider: "openai" }),
    record({ channelName: "Canal B", provider: "openai" }),
    record({ channelName: "Canal C", provider: "google" })
  ];

  const options = facetOptions(records, { channelName: "Canal A", provider: "openai" }, "channelName");
  assert.equal(options.length, 2);
  assert.deepEqual(options.map((option) => option.value).sort(), ["Canal A", "Canal B"]);
});

test("aggregates sum, average and count by dimension", () => {
  const records = [
    record({ channelName: "Canal A", totalTokens: 100 }),
    record({ channelName: "Canal A", totalTokens: 300 }),
    record({ channelName: "Canal B", totalTokens: 50 })
  ];

  assert.equal(aggregateByDimension(records, "channelName", { metric: "totalTokens", aggregation: "sum" })[0].value, 400);
  assert.equal(aggregateByDimension(records, "channelName", { metric: "totalTokens", aggregation: "average" })[0].value, 200);
  assert.equal(aggregateByDimension(records, "channelName", { aggregation: "count" })[0].value, 2);
});
