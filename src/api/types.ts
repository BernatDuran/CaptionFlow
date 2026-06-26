import type { ReactNode } from "react";

export type ProviderId = "openai" | "google" | "nanogpt";

export type Provider = {
  id: ProviderId;
  name: string;
  configured: boolean;
};

export type ModelOption = {
  id: string;
  label: string;
  limits?: { maxInputTokens: number | null };
};

export type PromptSummary = {
  id: string;
  name: string;
  description: string;
  outputFilenamePrefix: string;
  temperature: number;
  content: string;
};

export type DiagramPromptOption = {
  id: string;
  name: string;
  description: string;
  diagramType: string;
  temperature: number;
};

export type UsageTotal = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  unavailableUsageRuns: number;
};

export type UsageTotals = {
  document: UsageTotal;
  diagrams: UsageTotal;
  transcript: UsageTotal;
  all: UsageTotal;
};

export type ProcessResult = {
  markdown: string;
  filename: string;
  downloadUrl: string;
  pdfUrl?: string;
  metadata: {
    provider: string;
    model: string;
    prompt: string;
    title?: string;
    videoUrl?: string;
    channelName?: string;
    durationSeconds?: number;
    durationText?: string;
    transcriptLanguage?: string;
    transcriptWords?: number;
    outputWords?: number;
    transcriptRef: string;
    transcriptSource: string;
    chunked: boolean;
    chunks: number;
    usageTotals?: UsageTotals;
    processedAt?: string;
  };
};

export type ProcessJobResponse = {
  jobId?: string;
  id?: string;
  status: "queued" | "running" | "completed" | "error";
  step: string;
  detail?: string;
  result?: ProcessResult;
  error?: {
    code?: string;
    message: string;
  };
};

export type HistoryRun = {
  operation: string;
  provider: string | null;
  model: string | null;
  diagramType: string | null;
  diagramPromptId: string | null;
  totalTokens: number | null;
  durationMs: number;
  startedAt: string;
};

export type HistoryItem = {
  filename: string;
  downloadUrl: string;
  pdfUrl: string;
  hasDiagram: boolean;
  diagramFilename?: string;
  diagramKind?: string;
  diagramLabel?: string;
  diagramKinds?: string[];
  diagramLabels?: string[];
  diagramCount?: number;
  title: string;
  videoTitle?: string;
  videoUrl?: string;
  channelName?: string;
  provider?: string;
  model?: string;
  promptName?: string;
  usageTotals?: UsageTotals;
  latestDiagramRuns?: Record<string, string>;
  aiRuns?: HistoryRun[];
  transcriptWords?: number;
  outputWords?: number;
  durationSeconds?: number;
  durationText?: string;
  transcriptLanguage?: string;
  transcriptSource?: string;
  processedAt?: string;
  createdAt: string;
  size: number;
};

export type Settings = {
  activeProvider: ProviderId;
  selectedModels: Partial<Record<ProviderId, string>>;
  adaptiveChunkingEnabled?: boolean;
  minimumModelContextTokens?: number;
  outputRootDir?: string;
  analyticsEnabled?: boolean;
};

export type ProvidersResponse = {
  providers: Provider[];
  activeProvider: ProviderId;
  selectedModels: Settings["selectedModels"];
  adaptiveChunkingEnabled?: boolean;
  minimumModelContextTokens?: number;
  outputRootDir?: string;
  analyticsEnabled?: boolean;
};

export type TextModalConfig = {
  title: string;
  subtitle?: string;
  chips?: ReactNode[];
  content: string;
  onDownloadTxt?: () => void;
  enableCopy?: boolean;
  isMarkdown?: boolean;
};
