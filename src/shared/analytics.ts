export type AnalyticsArtifactType = "all" | "document" | "diagram";

export type AnalyticsChartType = "bar-vertical" | "bar-horizontal" | "scatter" | "heatmap" | "pie";

export type AnalyticsAggregation = "sum" | "average" | "min" | "max" | "count";

export type AnalyticsDimensionKey =
  | "filename"
  | "title"
  | "videoTitle"
  | "channelName"
  | "provider"
  | "model"
  | "promptName"
  | "artifactType"
  | "hasDiagram"
  | "diagramKinds"
  | "processedAt"
  | "month"
  | "transcriptLanguage"
  | "transcriptSource"
  | "chunked";

export type AnalyticsMetricKey =
  | "totalTokens"
  | "inputTokens"
  | "outputTokens"
  | "processingDurationMs"
  | "videoDurationSeconds"
  | "transcriptWords"
  | "outputWords"
  | "documentCount"
  | "diagramCount"
  | "tokensPerVideoMinute"
  | "tokensPerInputWord"
  | "tokensPerOutputWord"
  | "processingSecondsPerVideoMinute"
  | "outputWordsPerInputWord";

export type AnalyticsRecord = {
  filename: string;
  title: string;
  videoTitle: string | null;
  videoUrl: string | null;
  channelName: string | null;
  provider: string | null;
  model: string | null;
  promptName: string | null;
  artifactType: AnalyticsArtifactType;
  hasDiagram: boolean;
  diagramCount: number;
  diagramKinds: string[];
  processedAt: string;
  month: string | null;
  transcriptLanguage: string | null;
  transcriptSource: string | null;
  chunked: boolean;
  totalTokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  processingDurationMs: number | null;
  videoDurationSeconds: number | null;
  transcriptWords: number | null;
  outputWords: number | null;
  documentCount: number;
  tokensPerVideoMinute: number | null;
  tokensPerInputWord: number | null;
  tokensPerOutputWord: number | null;
  processingSecondsPerVideoMinute: number | null;
  outputWordsPerInputWord: number | null;
  unavailableUsageRuns: number;
};

export type AnalyticsChartConfig = {
  id: string;
  title: string;
  chartType: AnalyticsChartType;
  dimension?: AnalyticsDimensionKey;
  secondaryDimension?: AnalyticsDimensionKey;
  legendDimension?: AnalyticsDimensionKey;
  metric?: AnalyticsMetricKey;
  metricX?: AnalyticsMetricKey;
  metricY?: AnalyticsMetricKey;
  aggregation: AnalyticsAggregation;
  ratioNumerator?: AnalyticsMetricKey;
  ratioDenominator?: AnalyticsMetricKey;
  localFilters?: Partial<Record<AnalyticsDimensionKey, string>>;
};

export type AnalyticsDashboardConfig = {
  id: string;
  name: string;
  charts: AnalyticsChartConfig[];
  createdAt: string;
  updatedAt: string;
};

export const ANALYTICS_DIMENSIONS: { key: AnalyticsDimensionKey; label: string }[] = [
  { key: "month", label: "Mes" },
  { key: "channelName", label: "Canal" },
  { key: "provider", label: "Proveedor IA" },
  { key: "model", label: "Modelo" },
  { key: "promptName", label: "Prompt" },
  { key: "artifactType", label: "Tipo" },
  { key: "videoTitle", label: "Video" },
  { key: "filename", label: "Documento" },
  { key: "diagramKinds", label: "Tipo de diagrama" },
  { key: "transcriptLanguage", label: "Idioma" },
  { key: "transcriptSource", label: "Fuente transcripcion" },
  { key: "hasDiagram", label: "Tiene diagrama" },
  { key: "chunked", label: "Chunking" },
  { key: "processedAt", label: "Fecha" },
  { key: "title", label: "Titulo" }
];

export const ANALYTICS_METRICS: { key: AnalyticsMetricKey; label: string; unit: string }[] = [
  { key: "totalTokens", label: "Tokens usados", unit: "tokens" },
  { key: "inputTokens", label: "Tokens input", unit: "tokens" },
  { key: "outputTokens", label: "Tokens output", unit: "tokens" },
  { key: "processingDurationMs", label: "Tiempo procesamiento", unit: "ms" },
  { key: "videoDurationSeconds", label: "Duracion video", unit: "s" },
  { key: "transcriptWords", label: "Palabras transcripcion", unit: "palabras" },
  { key: "outputWords", label: "Palabras output", unit: "palabras" },
  { key: "documentCount", label: "Documentos", unit: "docs" },
  { key: "diagramCount", label: "Diagramas", unit: "diagramas" },
  { key: "tokensPerVideoMinute", label: "Tokens por minuto video", unit: "tokens/min" },
  { key: "tokensPerInputWord", label: "Tokens por palabra input", unit: "tokens/palabra" },
  { key: "tokensPerOutputWord", label: "Tokens por palabra output", unit: "tokens/palabra" },
  { key: "processingSecondsPerVideoMinute", label: "Segundos proceso por minuto video", unit: "s/min" },
  { key: "outputWordsPerInputWord", label: "Palabras output por input", unit: "ratio" }
];
