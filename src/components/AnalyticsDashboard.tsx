import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { ArrowLeft, X } from "lucide-react";
import {
  ANALYTICS_DIMENSIONS,
  ANALYTICS_METRICS,
  type AnalyticsChartConfig,
  type AnalyticsDimensionKey,
  type AnalyticsMetricKey,
  type AnalyticsRecord
} from "../shared/analytics";
import {
  aggregateByDimension,
  aggregateHeatmap,
  facetOptions,
  filterRecords,
  formatCompact,
  formatDimensionValue,
  formatDurationMs,
  formatDurationSeconds,
  formatMetric,
  getDimensionValues,
  getMetricValue,
  summarizeRecords,
  type AnalyticsFilters
} from "../analytics/analyticsUtils";

type AnalyticsDashboardProps = {
  onBack: () => void;
};

type AnalyticsDatasetResponse = {
  generatedAt: string;
  records: AnalyticsRecord[];
  unavailableUsageRuns: number;
};

type ChartClickPayload = {
  dimension: AnalyticsDimensionKey;
  value: string;
};

type ScatterPoint = {
  value: [number, number];
  name: string;
  dimensionKey: AnalyticsDimensionKey;
  dimensionValue: string;
  legendLabel?: string;
  recordCount: number;
};

const FILTERS: { key: AnalyticsDimensionKey; label: string; allLabel: string }[] = [
  { key: "channelName", label: "Canal", allLabel: "Todos los canales" },
  { key: "provider", label: "Proveedor IA", allLabel: "Todos" },
  { key: "model", label: "Modelo", allLabel: "Todos" },
  { key: "promptName", label: "Prompt", allLabel: "Todos" },
  { key: "videoTitle", label: "Video/documento", allLabel: "Todos" },
  { key: "month", label: "Mes", allLabel: "Todos los meses" }
];

const DEFAULT_CHARTS: AnalyticsChartConfig[] = [
  {
    id: "default-tokens-month",
    title: "Tokens por mes",
    chartType: "bar-vertical",
    dimension: "month",
    metric: "totalTokens",
    aggregation: "sum"
  },
  {
    id: "default-tokens-channel",
    title: "Tokens por canal",
    chartType: "bar-horizontal",
    dimension: "channelName",
    metric: "totalTokens",
    aggregation: "sum"
  },
  {
    id: "default-duration-tokens",
    title: "Duracion video vs tokens",
    chartType: "scatter",
    dimension: "videoTitle",
    metricX: "videoDurationSeconds",
    metricY: "totalTokens",
    legendDimension: "channelName",
    aggregation: "sum"
  },
  {
    id: "default-model-month",
    title: "Modelo y mes por tokens",
    chartType: "heatmap",
    dimension: "month",
    secondaryDimension: "model",
    metric: "totalTokens",
    aggregation: "sum"
  },
  {
    id: "default-provider-share",
    title: "Distribucion por proveedor",
    chartType: "pie",
    dimension: "provider",
    metric: "totalTokens",
    aggregation: "sum"
  }
];

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "No se pudo completar la operacion.");
  }
  return payload as T;
}

function getDimensionLabel(key?: AnalyticsDimensionKey) {
  return ANALYTICS_DIMENSIONS.find((dimension) => dimension.key === key)?.label || "Dimension";
}

function getMetricLabel(key?: AnalyticsMetricKey) {
  return ANALYTICS_METRICS.find((metric) => metric.key === key)?.label || "Metrica";
}

function buildChartTitle(config: AnalyticsChartConfig) {
  const metric = config.ratioNumerator
    ? `${getMetricLabel(config.ratioNumerator)} / ${getMetricLabel(config.ratioDenominator)}`
    : getMetricLabel(config.metric);

  if (config.chartType === "scatter") {
    return `${getMetricLabel(config.metricY || "totalTokens")} vs ${getMetricLabel(config.metricX || "videoDurationSeconds")}`;
  }
  if (config.chartType === "heatmap") {
    return `${metric} por ${getDimensionLabel(config.secondaryDimension)} y ${getDimensionLabel(config.dimension)}`;
  }
  return `${metric} por ${getDimensionLabel(config.dimension)}`;
}

function getAggregationLabel(aggregation: AnalyticsChartConfig["aggregation"]) {
  if (aggregation === "average") return "Promedio";
  if (aggregation === "count") return "Conteo";
  if (aggregation === "max") return "Maximo";
  if (aggregation === "min") return "Minimo";
  return "Suma";
}

function buildChartSubtitle(config: AnalyticsChartConfig) {
  const base = config.chartType === "scatter"
    ? `${getAggregationLabel(config.aggregation)}. Puntos por ${getDimensionLabel(config.dimension || "videoTitle")}`
    : getAggregationLabel(config.aggregation);
  if (config.chartType === "pie") return `${base}. Leyenda por ${getDimensionLabel(config.dimension)}`;
  if (config.chartType === "heatmap") return `${base}. Escala por intensidad`;
  if (config.legendDimension) return `${base}. Leyenda por ${getDimensionLabel(config.legendDimension)}`;
  return base;
}

function ChartConfigControls({
  config,
  onChange
}: {
  config: AnalyticsChartConfig;
  onChange?: (config: AnalyticsChartConfig) => void;
}) {
  if (!onChange) return null;

  const update = (patch: Partial<AnalyticsChartConfig>) => onChange({ ...config, ...patch });
  const supportsLegend = config.chartType === "scatter" || config.chartType === "bar-horizontal" || config.chartType === "bar-vertical";
  const primaryDimension = config.chartType === "scatter" ? config.dimension || "videoTitle" : config.dimension;
  const legendDimensions = ANALYTICS_DIMENSIONS.filter((dimension) =>
    dimension.key !== primaryDimension
  );

  return (
    <div className="analytics-chart-controls">
      {config.chartType !== "scatter" ? (
        <select
          aria-label="Dimension del grafico"
          value={config.dimension || "channelName"}
          onChange={(event) => {
            const dimension = event.target.value as AnalyticsDimensionKey;
            update({
              dimension,
              legendDimension: dimension === config.legendDimension ? undefined : config.legendDimension
            });
          }}
        >
          {ANALYTICS_DIMENSIONS.map((dimension) => (
            <option key={dimension.key} value={dimension.key}>{dimension.label}</option>
          ))}
        </select>
      ) : null}
      {config.chartType === "heatmap" ? (
        <select
          aria-label="Segunda dimension del grafico"
          value={config.secondaryDimension || "model"}
          onChange={(event) => update({ secondaryDimension: event.target.value as AnalyticsDimensionKey })}
        >
          {ANALYTICS_DIMENSIONS.map((dimension) => (
            <option key={dimension.key} value={dimension.key}>{dimension.label}</option>
          ))}
        </select>
      ) : null}
      {config.chartType === "scatter" ? (
        <>
          <select
            aria-label="Agrupar por"
            value={config.dimension || "videoTitle"}
            onChange={(event) => {
              const dimension = event.target.value as AnalyticsDimensionKey;
              update({
                dimension,
                legendDimension: dimension === config.legendDimension ? undefined : config.legendDimension
              });
            }}
          >
            {ANALYTICS_DIMENSIONS.map((dimension) => (
              <option key={dimension.key} value={dimension.key}>Agrupar: {dimension.label}</option>
            ))}
          </select>
          <select
            aria-label="Metrica del eje X"
            value={config.metricX || "videoDurationSeconds"}
            onChange={(event) => update({ metricX: event.target.value as AnalyticsMetricKey })}
          >
            {ANALYTICS_METRICS.map((metric) => (
              <option key={metric.key} value={metric.key}>X: {metric.label}</option>
            ))}
          </select>
          <select
            aria-label="Metrica del eje Y"
            value={config.metricY || "totalTokens"}
            onChange={(event) => update({ metricY: event.target.value as AnalyticsMetricKey })}
          >
            {ANALYTICS_METRICS.map((metric) => (
              <option key={metric.key} value={metric.key}>Y: {metric.label}</option>
            ))}
          </select>
        </>
      ) : (
        <select
          aria-label="Metrica del grafico"
          value={config.metric || "totalTokens"}
          onChange={(event) => update({ metric: event.target.value as AnalyticsMetricKey, ratioNumerator: undefined, ratioDenominator: undefined })}
        >
          {ANALYTICS_METRICS.map((metric) => (
            <option key={metric.key} value={metric.key}>{metric.label}</option>
          ))}
        </select>
      )}
      {supportsLegend ? (
        <select
          aria-label="Leyenda del grafico"
          value={config.legendDimension || ""}
          onChange={(event) => {
            const value = event.target.value as AnalyticsDimensionKey | "";
            update({ legendDimension: value || undefined });
          }}
        >
          <option value="">Sin leyenda</option>
          {legendDimensions.map((dimension) => (
            <option key={dimension.key} value={dimension.key}>Leyenda: {dimension.label}</option>
          ))}
        </select>
      ) : null}
      <select
        aria-label="Agregacion del grafico"
        value={config.aggregation}
        onChange={(event) => update({ aggregation: event.target.value as AnalyticsChartConfig["aggregation"] })}
      >
        <option value="sum">Suma</option>
        <option value="average">Promedio</option>
        <option value="min">Minimo</option>
        <option value="max">Maximo</option>
        <option value="count">Conteo</option>
      </select>
    </div>
  );
}

function chartPalette(count: number) {
  const colors = ["#2563eb", "#0f766e", "#f59e0b", "#e11d48", "#7c3aed", "#16a34a", "#475569", "#0891b2", "#be123c"];
  return colors.slice(0, Math.max(1, Math.min(count, colors.length)));
}

function aggregateValues(values: number[], aggregation: AnalyticsChartConfig["aggregation"]) {
  if (aggregation === "count") return values.length;
  if (values.length === 0) return null;
  if (aggregation === "average") return values.reduce((total, value) => total + value, 0) / values.length;
  if (aggregation === "min") return Math.min(...values);
  if (aggregation === "max") return Math.max(...values);
  return values.reduce((total, value) => total + value, 0);
}

function AnalyticsSelect({
  label,
  value,
  options,
  allLabel,
  onChange
}: {
  label: string;
  value: string;
  options: { value: string; label: string; count?: number }[];
  allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="analytics-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}{typeof option.count === "number" ? ` (${option.count})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildBarOption(config: AnalyticsChartConfig, records: AnalyticsRecord[], horizontal: boolean) {
  const primaryDimension = config.dimension || "channelName";
  const legendDimension = config.legendDimension === primaryDimension ? undefined : config.legendDimension;
  const points = aggregateByDimension(records, primaryDimension, config).slice(0, 14);
  const labels = points.map((point) => point.label);
  const metric = config.ratioNumerator ? config.ratioNumerator : config.metric;
  const legendPoints = legendDimension ? aggregateByDimension(records, legendDimension, config).slice(0, 8) : [];
  const series = legendDimension && legendPoints.length > 0
    ? legendPoints.map((legendPoint) => ({
        name: legendPoint.label,
        type: "bar",
        stack: "total",
        data: points.map((point) => {
          const value = aggregateByDimension(point.records, legendDimension, config)
            .find((candidate) => candidate.key === legendPoint.key)?.value || 0;
          return {
            value,
            dimensionKey: primaryDimension,
            dimensionValue: point.key
          };
        }),
        barMaxWidth: 34,
        emphasis: { focus: "series" }
      }))
    : [
        {
          type: "bar",
          data: points.map((point) => ({
            value: point.value,
            dimensionKey: primaryDimension,
            dimensionValue: point.key
          })),
          barMaxWidth: 34,
          emphasis: { focus: "series" }
        }
      ];

  return {
    empty: points.length === 0,
    option: {
      color: chartPalette(series.length),
      legend: legendPoints.length ? { top: 0, type: "scroll", itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 11 } } : undefined,
      grid: { top: legendPoints.length ? 42 : 18, right: 14, bottom: horizontal ? 24 : 46, left: horizontal ? 86 : 42, containLabel: true },
      tooltip: {
        trigger: "axis",
        valueFormatter: (value: number) => formatMetric(value, metric)
      },
      xAxis: horizontal
        ? { type: "value" }
        : { type: "category", data: labels, axisLabel: { interval: 0, rotate: labels.length > 5 ? 24 : 0, width: 72, overflow: "truncate", hideOverlap: true } },
      yAxis: horizontal
        ? { type: "category", data: labels, inverse: true, axisLabel: { width: 82, overflow: "truncate", hideOverlap: true } }
        : { type: "value" },
      series
    }
  };
}

function buildPieOption(config: AnalyticsChartConfig, records: AnalyticsRecord[]) {
  const points = aggregateByDimension(records, config.dimension || "provider", config).slice(0, 10);
  const metric = config.ratioNumerator ? config.ratioNumerator : config.metric;

  return {
    empty: points.length === 0,
    option: {
      color: ["#2563eb", "#0f766e", "#f59e0b", "#e11d48", "#7c3aed", "#16a34a", "#475569"],
      tooltip: {
        trigger: "item",
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}<br/>${formatMetric(params.value, metric)} (${params.percent}%)`
      },
      legend: { bottom: 0, type: "scroll" },
      series: [
        {
          type: "pie",
          radius: ["42%", "68%"],
          center: ["50%", "44%"],
          data: points.map((point) => ({
            name: point.label,
            value: point.value,
            dimensionKey: config.dimension,
            dimensionValue: point.key
          }))
        }
      ]
    }
  };
}

function buildScatterOption(config: AnalyticsChartConfig, records: AnalyticsRecord[]) {
  const metricX = config.metricX || "videoDurationSeconds";
  const metricY = config.metricY || "totalTokens";
  const pointDimension = config.dimension || "videoTitle";
  const legendDimension = config.legendDimension === pointDimension ? undefined : config.legendDimension;
  const seriesBuckets = new Map<string, { label: string; groups: Map<string, { label: string; records: AnalyticsRecord[] }> }>();

  for (const record of records) {
    const pointValues = getDimensionValues(record, pointDimension);
    const legendValues = legendDimension ? getDimensionValues(record, legendDimension) : ["Registros"];
    for (const legendValue of legendValues) {
      const bucket = seriesBuckets.get(legendValue) || {
        label: legendDimension ? formatDimensionValue(legendDimension, legendValue) : "Registros",
        groups: new Map<string, { label: string; records: AnalyticsRecord[] }>()
      };
      for (const pointValue of pointValues) {
        const group = bucket.groups.get(pointValue) || {
          label: formatDimensionValue(pointDimension, pointValue),
          records: []
        };
        group.records.push(record);
        bucket.groups.set(pointValue, group);
      }
      seriesBuckets.set(legendValue, bucket);
    }
  }

  const series = Array.from(seriesBuckets.values())
    .sort((a, b) => {
      const aCount = Array.from(a.groups.values()).reduce((total, group) => total + group.records.length, 0);
      const bCount = Array.from(b.groups.values()).reduce((total, group) => total + group.records.length, 0);
      return bCount - aCount;
    })
    .slice(0, 10)
    .map((bucket) => {
      const data = Array.from(bucket.groups.entries())
        .map(([pointValue, group]): ScatterPoint | null => {
          const x = aggregateValues(
            group.records.map((record) => getMetricValue(record, metricX)).filter((value): value is number => typeof value === "number"),
            config.aggregation
          );
          const y = aggregateValues(
            group.records.map((record) => getMetricValue(record, metricY)).filter((value): value is number => typeof value === "number"),
            config.aggregation
          );
          if (typeof x !== "number" || typeof y !== "number") return null;
          return {
            value: [x, y],
            name: group.label,
            dimensionKey: pointDimension,
            dimensionValue: pointValue,
            legendLabel: legendDimension ? bucket.label : undefined,
            recordCount: group.records.length
          };
        })
        .filter((point): point is ScatterPoint => point !== null)
        .sort((a, b) => b.recordCount - a.recordCount);

      return {
        name: bucket.label,
        type: "scatter",
        symbolSize: 11,
        data,
        emphasis: { focus: "series" }
      };
    })
    .filter((bucket) => bucket.data.length > 0);
  const pointCount = series.reduce((total, group) => total + group.data.length, 0);

  return {
    empty: pointCount === 0,
    option: {
      color: chartPalette(series.length),
      legend: legendDimension ? { top: 0, type: "scroll", itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 11 } } : undefined,
      grid: { top: legendDimension ? 42 : 18, right: 18, bottom: 48, left: 50, containLabel: true },
      tooltip: {
        trigger: "item",
        formatter: (params: { data: ScatterPoint }) => {
          const legendLine = params.data.legendLabel ? `<br/>${getDimensionLabel(legendDimension)}: ${params.data.legendLabel}` : "";
          const countLine = params.data.recordCount > 1 ? `<br/>Registros: ${params.data.recordCount.toLocaleString("es")}` : "";
          return `${params.data.name}${legendLine}<br/>${getMetricLabel(metricX)}: ${formatMetric(params.data.value[0], metricX)}<br/>${getMetricLabel(metricY)}: ${formatMetric(params.data.value[1], metricY)}${countLine}`;
        }
      },
      xAxis: { type: "value", name: getMetricLabel(metricX), nameLocation: "middle", nameGap: 30, nameTruncate: { maxWidth: 130 } },
      yAxis: { type: "value", name: getMetricLabel(metricY), nameGap: 34, nameTruncate: { maxWidth: 120 } },
      series
    }
  };
}

function buildHeatmapOption(config: AnalyticsChartConfig, records: AnalyticsRecord[]) {
  const xDimension = config.dimension || "month";
  const yDimension = config.secondaryDimension || "model";
  const heatmap = aggregateHeatmap(records, xDimension, yDimension, config);
  const max = Math.max(1, ...heatmap.cells.map((cell) => cell.value));
  const metric = config.ratioNumerator ? config.ratioNumerator : config.metric;

  return {
    empty: heatmap.cells.length === 0,
    option: {
      color: ["#2563eb"],
      grid: { top: 18, right: 20, bottom: 48, left: 88, containLabel: true },
      tooltip: {
        formatter: (params: { data: { value: [number, number, number]; dimensionKey: AnalyticsDimensionKey; dimensionValue: string } }) => {
          const [xIndex, yIndex, value] = params.data.value;
          return `${formatDimensionValue(yDimension, heatmap.yValues[yIndex])}<br/>${formatDimensionValue(xDimension, heatmap.xValues[xIndex])}: ${formatMetric(value, metric)}`;
        }
      },
      xAxis: { type: "category", data: heatmap.xValues.map((value) => formatDimensionValue(xDimension, value)), splitArea: { show: true }, axisLabel: { width: 76, overflow: "truncate", hideOverlap: true } },
      yAxis: { type: "category", data: heatmap.yValues.map((value) => formatDimensionValue(yDimension, value)), splitArea: { show: true }, axisLabel: { width: 84, overflow: "truncate", hideOverlap: true } },
      visualMap: { min: 0, max, calculable: true, orient: "horizontal", left: "center", bottom: 0, itemHeight: 78, textGap: 6 },
      series: [
        {
          type: "heatmap",
          data: heatmap.cells.map((cell) => ({
            value: [heatmap.xValues.indexOf(cell.x), heatmap.yValues.indexOf(cell.y), cell.value],
            dimensionKey: xDimension,
            dimensionValue: cell.x
          })),
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(15, 23, 42, 0.25)" } }
        }
      ]
    }
  };
}

function AnalyticsChart({
  config,
  records,
  onSelect,
  onChangeConfig
}: {
  config: AnalyticsChartConfig;
  records: AnalyticsRecord[];
  onSelect: (payload: ChartClickPayload) => void;
  onChangeConfig?: (config: AnalyticsChartConfig) => void;
}) {
  const scopedRecords = useMemo(() => filterRecords(records, config.localFilters || {}), [config.localFilters, records]);
  const chart = useMemo(() => {
    if (config.chartType === "bar-horizontal") return buildBarOption(config, scopedRecords, true);
    if (config.chartType === "bar-vertical") return buildBarOption(config, scopedRecords, false);
    if (config.chartType === "pie") return buildPieOption(config, scopedRecords);
    if (config.chartType === "scatter") return buildScatterOption(config, scopedRecords);
    return buildHeatmapOption(config, scopedRecords);
  }, [config, scopedRecords]);

  const onEvents = useMemo(
    () => ({
      click: (params: { data?: { dimensionKey?: AnalyticsDimensionKey; dimensionValue?: string } }) => {
        const dimension = params.data?.dimensionKey;
        const value = params.data?.dimensionValue;
        if (dimension && value) onSelect({ dimension, value });
      }
    }),
    [onSelect]
  );

  return (
    <section className="analytics-chart-panel">
      <header>
        <div className="analytics-chart-title">
          <h3>{buildChartTitle(config)}</h3>
          <span>{buildChartSubtitle(config)}</span>
        </div>
        <ChartConfigControls config={config} onChange={onChangeConfig} />
      </header>
      {chart.empty ? (
        <div className="analytics-chart-empty">Sin datos</div>
      ) : (
        <ReactECharts option={chart.option} style={{ height: config.chartType === "heatmap" ? 330 : 292 }} notMerge lazyUpdate onEvents={onEvents} />
      )}
    </section>
  );
}

function KpiGrid({ records }: { records: AnalyticsRecord[] }) {
  const summary = useMemo(() => summarizeRecords(records), [records]);
  const kpis = [
    { label: "Tokens", value: summary.totalTokens ? `${formatCompact(summary.totalTokens)} tok` : "Sin datos" },
    { label: "Tiempo total", value: summary.totalProcessingDurationMs ? formatDurationMs(summary.totalProcessingDurationMs) : "Sin datos" },
    { label: "Tiempo medio proceso", value: summary.averageProcessingDurationMs ? formatDurationMs(summary.averageProcessingDurationMs) : "Sin datos" },
    { label: "Duracion media", value: summary.averageVideoDurationSeconds ? formatDurationSeconds(summary.averageVideoDurationSeconds) : "Sin datos" },
    { label: "Palabras input", value: summary.transcriptWords ? formatCompact(summary.transcriptWords) : "Sin datos" },
    { label: "Palabras output", value: summary.outputWords ? formatCompact(summary.outputWords) : "Sin datos" },
    { label: "Documentos", value: summary.documentCount.toLocaleString("es") },
    { label: "Diagramas", value: summary.diagramCount.toLocaleString("es") }
  ];

  return (
    <div className="analytics-kpi-grid">
      {kpis.map((kpi) => (
        <div className="analytics-kpi" key={kpi.label}>
          <span>{kpi.label}</span>
          <strong>{kpi.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const [records, setRecords] = useState<AnalyticsRecord[]>([]);
  const [filters, setFilters] = useState<AnalyticsFilters>({ artifactType: "all" });
  const [summaryCharts, setSummaryCharts] = useState<AnalyticsChartConfig[]>(DEFAULT_CHARTS);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const dataset = await apiFetch<AnalyticsDatasetResponse>("/api/analytics/dataset");
        setRecords(dataset.records);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar la analitica.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  const filteredRecords = useMemo(() => filterRecords(records, filters), [filters, records]);

  function setFilter(key: AnalyticsDimensionKey, value: string) {
    setFilters((current) => {
      const next = { ...current };
      if (!value) delete next[key];
      else next[key] = value;
      if (!next.artifactType) next.artifactType = "all";
      return next;
    });
  }

  function toggleChartFilter(payload: ChartClickPayload) {
    setFilters((current) => {
      const next = { ...current };
      if (next[payload.dimension] === payload.value) delete next[payload.dimension];
      else next[payload.dimension] = payload.value;
      if (!next.artifactType) next.artifactType = "all";
      return next;
    });
  }

  function clearFilter(key: AnalyticsDimensionKey) {
    setFilters((current) => {
      const next = { ...current };
      delete next[key];
      if (!next.artifactType) next.artifactType = "all";
      return next;
    });
  }

  const activeFilterEntries = Object.entries(filters).filter(([key, value]) => value && !(key === "artifactType" && value === "all")) as [AnalyticsDimensionKey, string][];

  return (
    <section className="analytics-page">
      <header className="analytics-topbar">
        <button className="secondary-button compact-button" type="button" onClick={onBack}>
          <ArrowLeft size={16} />
          Volver
        </button>
        <div>
          <h1>Analitica</h1>
          <p>{filteredRecords.length.toLocaleString("es")} registros filtrados</p>
        </div>
        <span className="analytics-view-pill">Dashboard</span>
      </header>

      <div className="analytics-filter-bar">
        <label className="analytics-filter">
          <span>Tipo</span>
          <select value={filters.artifactType || "all"} onChange={(event) => setFilter("artifactType", event.target.value)}>
            <option value="all">Todos</option>
            <option value="document">Documento</option>
            <option value="diagram">Diagrama</option>
          </select>
        </label>
        {FILTERS.map((filter) => (
          <AnalyticsSelect
            key={filter.key}
            label={filter.label}
            allLabel={filter.allLabel}
            value={filters[filter.key] || ""}
            options={facetOptions(records, filters, filter.key)}
            onChange={(value) => setFilter(filter.key, value)}
          />
        ))}
      </div>

      {activeFilterEntries.length ? (
        <div className="analytics-filter-chips" aria-label="Filtros activos">
          {activeFilterEntries.map(([key, value]) => (
            <button key={`${key}-${value}`} type="button" onClick={() => clearFilter(key)}>
              <span>{getDimensionLabel(key)}: {formatDimensionValue(key, value)}</span>
              <X size={13} />
            </button>
          ))}
        </div>
      ) : null}

      {error ? <div className="error-message compact analytics-error" role="alert">{error}</div> : null}

      {isLoading ? (
        <div className="analytics-empty">Cargando analitica...</div>
      ) : records.length === 0 ? (
        <div className="analytics-empty">Todavia no hay resultados con metadatos para analizar.</div>
      ) : (
        <>
          <KpiGrid records={filteredRecords} />
          {filteredRecords.some((record) => record.unavailableUsageRuns > 0) ? (
            <div className="analytics-data-note">Hay ejecuciones sin uso de tokens informado por el proveedor.</div>
          ) : null}
          <div className="analytics-chart-grid">
            {summaryCharts.map((chart) => (
              <AnalyticsChart
                key={chart.id}
                config={chart}
                records={filteredRecords}
                onSelect={toggleChartFilter}
                onChangeConfig={(nextChart) =>
                  setSummaryCharts((current) => current.map((item) => (item.id === nextChart.id ? nextChart : item)))
                }
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
