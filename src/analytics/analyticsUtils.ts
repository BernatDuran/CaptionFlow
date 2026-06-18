import {
  type AnalyticsAggregation,
  type AnalyticsChartConfig,
  type AnalyticsDimensionKey,
  type AnalyticsMetricKey,
  type AnalyticsRecord
} from "../shared/analytics";

export type AnalyticsFilters = Partial<Record<AnalyticsDimensionKey, string>>;

export type FacetOption = {
  value: string;
  label: string;
  count: number;
};

export type AggregatedPoint = {
  key: string;
  label: string;
  value: number;
  records: AnalyticsRecord[];
};

export function safeDivide(numerator: number | null | undefined, denominator: number | null | undefined) {
  if (typeof numerator !== "number" || !Number.isFinite(numerator)) return null;
  if (typeof denominator !== "number" || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getDimensionValues(record: AnalyticsRecord, key: AnalyticsDimensionKey): string[] {
  const value = record[key];
  if (Array.isArray(value)) return value.length ? value : ["Sin datos"];
  if (typeof value === "boolean") return [value ? "true" : "false"];
  if (typeof value === "number") return [String(value)];
  if (typeof value === "string" && value.trim()) return [value];
  return ["Sin datos"];
}

export function formatDimensionValue(key: AnalyticsDimensionKey, value: string) {
  if (value === "Sin datos") return value;
  if (key === "model") return value.includes("/") ? value.split("/").pop() || value : value;
  if (key === "artifactType") {
    if (value === "all") return "Todos";
    if (value === "document") return "Documento";
    if (value === "diagram") return "Diagrama";
  }
  if (key === "hasDiagram" || key === "chunked") return value === "true" ? "Si" : "No";
  if (key === "month") {
    const [year, month] = value.split("-").map(Number);
    if (year && month) {
      return new Intl.DateTimeFormat("es", { month: "short", year: "2-digit" })
        .format(new Date(year, month - 1, 1))
        .replace(".", "");
    }
  }
  if (key === "processedAt") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("es", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(date);
    }
  }
  return value;
}

export function getMetricValue(record: AnalyticsRecord, key?: AnalyticsMetricKey) {
  if (!key) return null;
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getConfiguredMetricValue(record: AnalyticsRecord, config: Pick<AnalyticsChartConfig, "metric" | "ratioNumerator" | "ratioDenominator">) {
  if (config.ratioNumerator && config.ratioDenominator) {
    return safeDivide(getMetricValue(record, config.ratioNumerator), getMetricValue(record, config.ratioDenominator));
  }
  return getMetricValue(record, config.metric);
}

export function filterRecords(records: AnalyticsRecord[], filters: AnalyticsFilters = {}) {
  const activeFilters = Object.entries(filters).filter((entry): entry is [AnalyticsDimensionKey, string] => Boolean(entry[1]));
  if (activeFilters.length === 0) return records;

  return records.filter((record) =>
    activeFilters.every(([key, value]) => getDimensionValues(record, key).includes(value))
  );
}

export function facetOptions(records: AnalyticsRecord[], filters: AnalyticsFilters, key: AnalyticsDimensionKey): FacetOption[] {
  const scoped = filterRecords(records, Object.fromEntries(Object.entries(filters).filter(([filterKey]) => filterKey !== key)) as AnalyticsFilters);
  const counts = new Map<string, number>();

  for (const record of scoped) {
    for (const value of getDimensionValues(record, key)) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: formatDimensionValue(key, value), count }))
    .sort((a, b) => {
      if (key === "month") return b.value.localeCompare(a.value);
      return normalizeText(a.label).localeCompare(normalizeText(b.label), "es");
    });
}

function aggregate(values: number[], aggregation: AnalyticsAggregation) {
  if (aggregation === "count") return values.length;
  if (values.length === 0) return 0;
  if (aggregation === "average") return values.reduce((total, value) => total + value, 0) / values.length;
  if (aggregation === "min") return Math.min(...values);
  if (aggregation === "max") return Math.max(...values);
  return values.reduce((total, value) => total + value, 0);
}

export function aggregateByDimension(
  records: AnalyticsRecord[],
  dimension: AnalyticsDimensionKey,
  config: Pick<AnalyticsChartConfig, "metric" | "ratioNumerator" | "ratioDenominator" | "aggregation">
): AggregatedPoint[] {
  const groups = new Map<string, AnalyticsRecord[]>();

  for (const record of records) {
    for (const value of getDimensionValues(record, dimension)) {
      const group = groups.get(value) || [];
      group.push(record);
      groups.set(value, group);
    }
  }

  return Array.from(groups.entries())
    .map(([key, groupRecords]) => {
      const values = config.aggregation === "count"
        ? groupRecords.map(() => 1)
        : groupRecords
            .map((record) => getConfiguredMetricValue(record, config))
            .filter((value): value is number => typeof value === "number");

      return {
        key,
        label: formatDimensionValue(dimension, key),
        value: aggregate(values, config.aggregation),
        records: groupRecords
      };
    })
    .filter((point) => point.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function aggregateHeatmap(
  records: AnalyticsRecord[],
  xDimension: AnalyticsDimensionKey,
  yDimension: AnalyticsDimensionKey,
  config: Pick<AnalyticsChartConfig, "metric" | "ratioNumerator" | "ratioDenominator" | "aggregation">
) {
  const xValues = Array.from(new Set(records.flatMap((record) => getDimensionValues(record, xDimension)))).sort();
  const yValues = Array.from(new Set(records.flatMap((record) => getDimensionValues(record, yDimension)))).sort();
  const cells: { x: string; y: string; value: number }[] = [];

  for (const x of xValues) {
    for (const y of yValues) {
      const scoped = records.filter(
        (record) => getDimensionValues(record, xDimension).includes(x) && getDimensionValues(record, yDimension).includes(y)
      );
      const values = config.aggregation === "count"
        ? scoped.map(() => 1)
        : scoped
            .map((record) => getConfiguredMetricValue(record, config))
            .filter((value): value is number => typeof value === "number");
      const value = aggregate(values, config.aggregation);
      if (value > 0) cells.push({ x, y, value });
    }
  }

  return { xValues, yValues, cells };
}

function sumUnique(records: AnalyticsRecord[], metric: AnalyticsMetricKey) {
  const seen = new Set<string>();
  let total = 0;

  for (const record of records) {
    if (seen.has(record.filename)) continue;
    seen.add(record.filename);
    total += getMetricValue(record, metric) || 0;
  }

  return total;
}

function averageMetric(records: AnalyticsRecord[], metric: AnalyticsMetricKey) {
  const values = records.map((record) => getMetricValue(record, metric)).filter((value): value is number => typeof value === "number");
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function summarizeRecords(records: AnalyticsRecord[]) {
  return {
    totalTokens: records.reduce((total, record) => total + (record.totalTokens || 0), 0),
    totalProcessingDurationMs: records.reduce((total, record) => total + (record.processingDurationMs || 0), 0),
    averageProcessingDurationMs: averageMetric(records, "processingDurationMs"),
    averageVideoDurationSeconds: averageMetric(records, "videoDurationSeconds"),
    transcriptWords: sumUnique(records, "transcriptWords"),
    outputWords: sumUnique(records, "outputWords"),
    documentCount: new Set(records.map((record) => record.filename)).size,
    diagramCount: sumUnique(records, "diagramCount"),
    unavailableUsageRuns: records.reduce((total, record) => total + record.unavailableUsageRuns, 0)
  };
}

export function formatMetric(value: number | null | undefined, metric?: AnalyticsMetricKey) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Sin datos";

  if (metric === "processingDurationMs") return formatDurationMs(value);
  if (metric === "videoDurationSeconds") return formatDurationSeconds(value);
  if (metric?.includes("Per") || metric === "outputWordsPerInputWord") {
    return value.toLocaleString("es", { maximumFractionDigits: value >= 10 ? 1 : 2 });
  }
  if (metric?.includes("Tokens") || metric === "totalTokens" || metric === "inputTokens" || metric === "outputTokens") {
    return formatCompact(value);
  }
  return Math.round(value).toLocaleString("es");
}

export function formatCompact(value: number) {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toLocaleString("es", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toLocaleString("es", { maximumFractionDigits: value >= 10000 ? 0 : 1 })}k`;
  return Math.round(value).toLocaleString("es");
}

export function formatDurationMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return formatDurationSeconds(ms / 1000);
}

export function formatDurationSeconds(seconds: number) {
  if (seconds < 60) return `${seconds.toLocaleString("es", { maximumFractionDigits: seconds >= 10 ? 0 : 1 })} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes} min ${rest.toString().padStart(2, "0")} s`;
}
