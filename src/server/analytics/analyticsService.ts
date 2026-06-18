import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getRootDir } from "../config/configService";
import { listResultHistory } from "../files/fileService";
import type { HistoryItem, UsageTotal } from "../types";
import {
  ANALYTICS_DIMENSIONS,
  ANALYTICS_METRICS,
  type AnalyticsChartConfig,
  type AnalyticsChartType,
  type AnalyticsDashboardConfig,
  type AnalyticsRecord
} from "../../shared/analytics";

const CONFIG_DIR = path.join(getRootDir(), "config");
const DEFAULT_DASHBOARDS_PATH = path.join(CONFIG_DIR, "analytics.dashboards.json");

const CHART_TYPES = new Set<AnalyticsChartType>(["bar-vertical", "bar-horizontal", "scatter", "heatmap", "pie"]);
const DIMENSIONS = new Set(ANALYTICS_DIMENSIONS.map((dimension) => dimension.key));
const METRICS = new Set(ANALYTICS_METRICS.map((metric) => metric.key));

function getDashboardsPath() {
  return process.env.CAPTIONFLOW_ANALYTICS_DASHBOARDS_PATH || DEFAULT_DASHBOARDS_PATH;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function safeRatio(numerator: number | null | undefined, denominator: number | null | undefined) {
  if (typeof numerator !== "number" || !Number.isFinite(numerator)) return null;
  if (typeof denominator !== "number" || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

function tokenMetric(value: number | undefined, total?: UsageTotal) {
  if (!total) return null;
  if (typeof value === "number" && value > 0) return value;
  if (total.unavailableUsageRuns > 0) return null;
  return finiteNumber(value);
}

function durationMetric(total?: UsageTotal) {
  if (!total) return null;
  return typeof total.durationMs === "number" && total.durationMs > 0 ? total.durationMs : null;
}

function monthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildRecord(item: HistoryItem, artifactType: AnalyticsRecord["artifactType"], total?: UsageTotal): AnalyticsRecord {
  const processedAt = item.processedAt || item.createdAt;
  const totalTokens = tokenMetric(total?.totalTokens, total);
  const inputTokens = tokenMetric(total?.inputTokens, total);
  const outputTokens = tokenMetric(total?.outputTokens, total);
  const processingDurationMs = durationMetric(total);
  const videoDurationSeconds = finiteNumber(item.durationSeconds);
  const transcriptWords = finiteNumber(item.transcriptWords);
  const outputWords = finiteNumber(item.outputWords);
  const videoMinutes = safeRatio(videoDurationSeconds, 60);

  return {
    filename: item.filename,
    title: item.title,
    videoTitle: item.videoTitle || item.title || null,
    videoUrl: item.videoUrl || null,
    channelName: item.channelName || null,
    provider: item.provider || null,
    model: item.model || null,
    promptName: item.promptName || null,
    artifactType,
    hasDiagram: item.hasDiagram,
    diagramCount: item.diagramCount || (item.hasDiagram ? 1 : 0),
    diagramKinds: item.diagramKinds || (item.diagramKind ? [item.diagramKind] : []),
    processedAt,
    month: monthKey(processedAt),
    transcriptLanguage: item.transcriptLanguage || null,
    transcriptSource: item.transcriptSource || null,
    chunked: Boolean(item.aiRuns?.some((run) => run.operation === "chunk_summary")),
    totalTokens,
    inputTokens,
    outputTokens,
    processingDurationMs,
    videoDurationSeconds,
    transcriptWords,
    outputWords,
    documentCount: 1,
    tokensPerVideoMinute: safeRatio(totalTokens, videoMinutes),
    tokensPerInputWord: safeRatio(totalTokens, transcriptWords),
    tokensPerOutputWord: safeRatio(totalTokens, outputWords),
    processingSecondsPerVideoMinute: safeRatio(
      processingDurationMs === null ? null : processingDurationMs / 1000,
      videoMinutes
    ),
    outputWordsPerInputWord: safeRatio(outputWords, transcriptWords),
    unavailableUsageRuns: total?.unavailableUsageRuns || 0
  };
}

export function normalizeHistoryItemForAnalytics(item: HistoryItem): AnalyticsRecord[] {
  const records = [
    buildRecord(item, "all", item.usageTotals?.all),
    buildRecord(item, "document", item.usageTotals?.document)
  ];

  if (item.hasDiagram || item.usageTotals?.diagrams.durationMs || item.usageTotals?.diagrams.totalTokens) {
    records.push(buildRecord(item, "diagram", item.usageTotals?.diagrams));
  }

  return records;
}

export async function listAnalyticsDataset() {
  const items = await listResultHistory();
  const records = items.flatMap(normalizeHistoryItemForAnalytics);
  const unavailableUsageRuns = records.reduce((total, record) => total + record.unavailableUsageRuns, 0);

  return {
    generatedAt: new Date().toISOString(),
    records,
    unavailableUsageRuns
  };
}

function isDimension(value: unknown) {
  return typeof value === "string" && DIMENSIONS.has(value as never);
}

function isMetric(value: unknown) {
  return typeof value === "string" && METRICS.has(value as never);
}

function sanitizeChart(chart: Partial<AnalyticsChartConfig>, fallbackIndex: number): AnalyticsChartConfig {
  if (!chart || typeof chart !== "object") {
    throw new Error("La configuracion del grafico no es valida.");
  }

  if (!chart.chartType || !CHART_TYPES.has(chart.chartType)) {
    throw new Error("Selecciona un tipo de grafico valido.");
  }

  const aggregation = chart.aggregation || "sum";
  if (!["sum", "average", "min", "max", "count"].includes(aggregation)) {
    throw new Error("Selecciona una agregacion valida.");
  }

  const localFilters = chart.localFilters && typeof chart.localFilters === "object"
    ? Object.fromEntries(
        Object.entries(chart.localFilters).filter(([key, value]) => isDimension(key) && typeof value === "string")
      )
    : undefined;

  return {
    id: chart.id || randomUUID(),
    title: String(chart.title || `Grafico ${fallbackIndex + 1}`).trim().slice(0, 90),
    chartType: chart.chartType,
    dimension: isDimension(chart.dimension) ? chart.dimension : undefined,
    secondaryDimension: isDimension(chart.secondaryDimension) ? chart.secondaryDimension : undefined,
    legendDimension: isDimension(chart.legendDimension) ? chart.legendDimension : undefined,
    metric: isMetric(chart.metric) ? chart.metric : undefined,
    metricX: isMetric(chart.metricX) ? chart.metricX : undefined,
    metricY: isMetric(chart.metricY) ? chart.metricY : undefined,
    aggregation,
    ratioNumerator: isMetric(chart.ratioNumerator) ? chart.ratioNumerator : undefined,
    ratioDenominator: isMetric(chart.ratioDenominator) ? chart.ratioDenominator : undefined,
    localFilters
  };
}

function sanitizeDashboard(input: Partial<AnalyticsDashboardConfig>, existing?: AnalyticsDashboardConfig): AnalyticsDashboardConfig {
  const name = String(input.name || existing?.name || "").trim();
  if (!name) {
    throw new Error("Indica un nombre para el dashboard.");
  }

  const charts = Array.isArray(input.charts) ? input.charts : existing?.charts || [];
  const now = new Date().toISOString();

  return {
    id: existing?.id || input.id || randomUUID(),
    name: name.slice(0, 80),
    charts: charts.map(sanitizeChart),
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now
  };
}

export async function readAnalyticsDashboards(): Promise<AnalyticsDashboardConfig[]> {
  try {
    const raw = await fs.readFile(getDashboardsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AnalyticsDashboardConfig>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((dashboard) => sanitizeDashboard(dashboard));
  } catch {
    return [];
  }
}

async function writeAnalyticsDashboards(dashboards: AnalyticsDashboardConfig[]) {
  await fs.mkdir(path.dirname(getDashboardsPath()), { recursive: true });
  await fs.writeFile(getDashboardsPath(), `${JSON.stringify(dashboards, null, 2)}\n`, "utf8");
}

export async function createAnalyticsDashboard(input: Partial<AnalyticsDashboardConfig>) {
  const dashboards = await readAnalyticsDashboards();
  const dashboard = sanitizeDashboard(input);
  await writeAnalyticsDashboards([...dashboards, dashboard]);
  return dashboard;
}

export async function updateAnalyticsDashboard(id: string, input: Partial<AnalyticsDashboardConfig>) {
  const dashboards = await readAnalyticsDashboards();
  const index = dashboards.findIndex((dashboard) => dashboard.id === id);
  if (index < 0) {
    throw new Error("Dashboard no encontrado.");
  }

  const dashboard = sanitizeDashboard(input, dashboards[index]);
  const next = [...dashboards];
  next[index] = dashboard;
  await writeAnalyticsDashboards(next);
  return dashboard;
}

export async function deleteAnalyticsDashboard(id: string) {
  const dashboards = await readAnalyticsDashboards();
  const next = dashboards.filter((dashboard) => dashboard.id !== id);
  if (next.length === dashboards.length) {
    throw new Error("Dashboard no encontrado.");
  }

  await writeAnalyticsDashboards(next);
}
