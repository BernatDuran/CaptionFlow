export type ProviderId = "openai" | "google" | "nanogpt";

export type PromptDefinition = {
  id: string;
  filename: string;
  name: string;
  description: string;
  outputFilenamePrefix: string;
  temperature: number;
  content: string;
};

export type DiagramPromptDefinition = PromptDefinition & {
  diagramType: string;
};

export type ModelTokenLimits = {
  provider: "openai" | "gemini" | "nanogpt";
  modelId: string;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  source: "api" | "manual" | "unknown";
  lastUpdated: string;
};

export type ModelDefinition = {
  id: string;
  label: string;
  contextTokens?: number;
  limits?: ModelTokenLimits;
};

export type LocalSettings = {
  activeProvider: ProviderId;
  selectedModels: Partial<Record<ProviderId, string>>;
  adaptiveChunkingEnabled?: boolean;
  minimumModelContextTokens?: number;
  outputRootDir?: string;
  analyticsEnabled?: boolean;
};

export type GenerateTextInput = {
  provider: ProviderId;
  model: string;
  prompt: string;
  temperature: number;
};

export type UsageSource = "provider_reported" | "unavailable";

export type GenerateTextUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  source: UsageSource;
  rawUsage?: unknown;
};

export type RunTiming = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

export type GenerateTextResult = {
  text: string;
  usage: GenerateTextUsage;
  timing: RunTiming;
};

export type RunOperation = "yt_dlp_info" | "yt_dlp_captions" | "chunk_summary" | "document_generation" | "diagram_generation";

export type RunScope = "transcript" | "document" | "diagram";

export type OperationRun = {
  runId: string;
  operation: RunOperation;
  scope: RunScope;
  provider: ProviderId | null;
  model: string | null;
  promptId: string | null;
  diagramPromptId: string | null;
  diagramType: string | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  usageSource: UsageSource;
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

export type VideoTranscript = {
  videoId?: string;
  title?: string;
  url: string;
  transcript: string;
  language?: string;
  source: "official" | "automatic";
  channelName?: string;
  durationSeconds?: number;
  durationText?: string;
  uploadDate?: string;
  runs?: OperationRun[];
  cached?: boolean;
};

export type ResultMetadata = {
  provider: ProviderId;
  model: string;
  promptId: string;
  promptName: string;
  promptContent?: string;
  resultFilename: string;
  transcriptRef: string;
  transcriptHash: string;
  processedAt: string;
  title?: string;
  videoTitle?: string;
  videoUrl: string;
  videoId?: string;
  channelName?: string;
  durationSeconds?: number;
  durationText?: string;
  uploadDate?: string;
  transcriptLanguage?: string;
  transcriptSource: "official" | "automatic";
  transcriptCached: boolean;
  transcriptWords: number;
  transcriptChars: number;
  outputWords?: number;
  chunked: boolean;
  chunks: number;
  chunkingStrategy?: "none" | "fixed" | "adaptive";
  chunkSizeChars?: number | null;
  chunkOverlapChars?: number | null;
  modelContextTokensUsed?: number | null;
  aiRuns?: OperationRun[];
  latestDiagramRuns?: Record<string, string>;
  usageTotals?: UsageTotals;
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
  provider?: ProviderId;
  model?: string;
  promptName?: string;
  usageTotals?: UsageTotals;
  latestDiagramRuns?: Record<string, string>;
  aiRuns?: OperationRun[];
  transcriptWords?: number;
  outputWords?: number;
  durationSeconds?: number;
  durationText?: string;
  uploadDate?: string;
  transcriptLanguage?: string;
  transcriptSource?: "official" | "automatic";
  processedAt?: string;
  createdAt: string;
  size: number;
};

export type AppErrorCode =
  | "INVALID_YOUTUBE_URL"
  | "VIDEO_NOT_ACCESSIBLE"
  | "NO_TRANSCRIPT"
  | "YTDLP_NOT_INSTALLED"
  | "PROMPT_NOT_FOUND"
  | "NO_PROMPTS"
  | "PROVIDER_NOT_CONFIGURED"
  | "API_KEY_MISSING"
  | "MODEL_MISSING"
  | "AI_PROVIDER_ERROR"
  | "EMPTY_AI_RESPONSE"
  | "TRANSCRIPT_TOO_LONG"
  | "FILE_NOT_FOUND"
  | "PROCESS_JOB_NOT_FOUND"
  | "UNKNOWN_LIMITS"
  | "TOKEN_LIMIT_EXCEEDED"
  | "VALIDATION_ERROR";

export class AppError extends Error {
  status: number;
  code: AppErrorCode;

  constructor(code: AppErrorCode, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}
