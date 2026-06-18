import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createAnalyticsDashboard,
  deleteAnalyticsDashboard,
  normalizeHistoryItemForAnalytics,
  readAnalyticsDashboards,
  safeRatio,
  updateAnalyticsDashboard
} from "./analyticsService";
import type { HistoryItem, UsageTotals } from "../types";

function totals(patch: Partial<UsageTotals["all"]> = {}): UsageTotals {
  const empty = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    durationMs: 0,
    unavailableUsageRuns: 0
  };

  return {
    all: { ...empty, ...patch },
    document: { ...empty, ...patch },
    diagrams: { ...empty },
    transcript: { ...empty }
  };
}

function historyItem(patch: Partial<HistoryItem> = {}): HistoryItem {
  return {
    filename: "resumen-2026.md",
    downloadUrl: "/api/download/resumen-2026.md",
    pdfUrl: "/api/pdf/resumen-2026.md",
    hasDiagram: true,
    diagramCount: 1,
    diagramKinds: ["flowchart"],
    title: "Documento",
    videoTitle: "Video de prueba",
    videoUrl: "https://youtube.com/watch?v=test",
    channelName: "Canal",
    provider: "openai",
    model: "gpt-test",
    promptName: "Resumen",
    usageTotals: totals({ inputTokens: 800, outputTokens: 200, totalTokens: 1000, durationMs: 30000 }),
    transcriptWords: 500,
    outputWords: 120,
    durationSeconds: 300,
    transcriptLanguage: "es",
    transcriptSource: "official",
    processedAt: "2026-06-18T10:30:00.000Z",
    createdAt: "2026-06-18T10:31:00.000Z",
    size: 2048,
    ...patch
  };
}

test("safeRatio returns null for missing or zero denominators", () => {
  assert.equal(safeRatio(10, 0), null);
  assert.equal(safeRatio(10, null), null);
  assert.equal(safeRatio(null, 10), null);
  assert.equal(safeRatio(10, 2), 5);
});

test("normalizes complete history metadata into scoped analytics records", () => {
  const records = normalizeHistoryItemForAnalytics(historyItem());
  const all = records.find((record) => record.artifactType === "all");

  assert.equal(records.length, 3);
  assert.equal(all?.month, "2026-06");
  assert.equal(all?.totalTokens, 1000);
  assert.equal(all?.tokensPerVideoMinute, 200);
  assert.equal(all?.tokensPerInputWord, 2);
  assert.equal(all?.tokensPerOutputWord, 1000 / 120);
  assert.equal(all?.processingSecondsPerVideoMinute, 6);
  assert.equal(all?.outputWordsPerInputWord, 120 / 500);
});

test("normalizes partial history metadata without invalid ratios", () => {
  const records = normalizeHistoryItemForAnalytics(
    historyItem({
      usageTotals: undefined,
      transcriptWords: undefined,
      outputWords: undefined,
      durationSeconds: undefined,
      processedAt: undefined,
      hasDiagram: false,
      diagramCount: undefined,
      diagramKinds: undefined
    })
  );

  assert.equal(records.length, 2);
  assert.equal(records[0].totalTokens, null);
  assert.equal(records[0].tokensPerVideoMinute, null);
  assert.equal(records[0].month, "2026-06");
});

test("creates, updates and deletes dashboard configs in a temp file", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "captionflow-analytics-"));
  process.env.CAPTIONFLOW_ANALYTICS_DASHBOARDS_PATH = path.join(dir, "dashboards.json");

  try {
    const created = await createAnalyticsDashboard({
      name: "Mi dashboard",
      charts: [
        {
          id: "chart-1",
          title: "Tokens por canal",
          chartType: "bar-horizontal",
          dimension: "channelName",
          metric: "totalTokens",
          aggregation: "sum"
        }
      ]
    });

    assert.equal((await readAnalyticsDashboards()).length, 1);
    assert.equal(created.name, "Mi dashboard");

    const updated = await updateAnalyticsDashboard(created.id, {
      name: "Dashboard actualizado",
      charts: created.charts
    });
    assert.equal(updated.name, "Dashboard actualizado");

    await deleteAnalyticsDashboard(created.id);
    assert.equal((await readAnalyticsDashboards()).length, 0);
  } finally {
    delete process.env.CAPTIONFLOW_ANALYTICS_DASHBOARDS_PATH;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
