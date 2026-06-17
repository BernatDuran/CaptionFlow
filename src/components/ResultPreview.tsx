import { useState } from "react";
import { Check, Copy, X, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DocumentActions, type DiagramPromptOption } from "./DocumentActions";
import type { HistoryItem } from "./HistoryPanel";
import { useModalClose } from "./useModalClose";

type UsageTotal = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  unavailableUsageRuns: number;
};

type UsageTotals = {
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

type ResultPreviewProps = {
  result: ProcessResult;
  onClose: () => void;
  onDiagram: (filename: string, promptId: string, mode?: "confirm" | "generate") => void;
  diagramPrompts: DiagramPromptOption[];
  historyItem?: HistoryItem;
  isDiagramLoading?: boolean;
  onViewPrompt?: (filename: string) => void;
  onViewTranscript?: (filename: string) => void;
};

function formatTokens(value?: number) {
  if (!value) return "";
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k tokens`;
  return `${value} tokens`;
}

function formatDate(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  }).format(new Date(value));
}

function formatDuration(ms?: number) {
  if (!ms) return "";
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds >= 10 ? 0 : 1)} s`;
  return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
}

function formatMetadataModel(provider: string, model: string) {
  if (provider.toLowerCase() !== "nanogpt") return model;
  const slashIndex = model.indexOf("/");
  return slashIndex >= 0 ? model.slice(slashIndex + 1) : model;
}

export function ResultPreview({ result, onClose, onDiagram, diagramPrompts, historyItem, isDiagramLoading, onViewPrompt, onViewTranscript }: ResultPreviewProps) {
  const [copied, setCopied] = useState(false);
  const { handleBackdropClick } = useModalClose(onClose);

  async function handleCopy() {
    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa del resultado" onClick={handleBackdropClick}>
      <section className="result-modal">
        <header className="modal-header">
          <div>
            <h2>Resultado Markdown</h2>
            <p className="subtitle-subtle">
              {result.metadata.processedAt ? `${formatDate(result.metadata.processedAt)} · ` : ""}
              {result.metadata.prompt} · {result.metadata.provider} · {formatMetadataModel(result.metadata.provider, result.metadata.model)}
            </p>
            {result.metadata.title && result.metadata.videoUrl ? (
              <a className="video-title-link" href={result.metadata.videoUrl} target="_blank" rel="noreferrer">
                {result.metadata.title}
              </a>
            ) : null}
          </div>
          <div className="result-header-controls compact-actions">
            <button className="secondary-button" type="button" onClick={handleCopy}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <DocumentActions
              filename={result.filename}
              downloadUrl={result.downloadUrl}
              pdfUrl={result.pdfUrl || `/api/pdf/${encodeURIComponent(result.filename)}`}
              diagramPrompts={diagramPrompts}
              onOpen={() => undefined}
              onDiagram={onDiagram}
              onTranscript={onViewTranscript}
              hasDiagram={historyItem?.hasDiagram}
              existingDiagramKind={historyItem?.diagramKind}
              existingDiagramKinds={historyItem?.diagramKinds}
              aiRuns={historyItem?.aiRuns}
              showOpen={false}
              disabled={isDiagramLoading}
              align="right"
            />
            {onViewPrompt ? (
              <button className="secondary-button" type="button" onClick={() => onViewPrompt(result.filename)}>
                <Eye size={15} />
                Ver Prompt
              </button>
            ) : null}
            <button className="icon-button result-close-button" type="button" aria-label="Cerrar vista previa" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="metadata-row">
          {result.metadata.durationText ? <span>Vídeo: {result.metadata.durationText}</span> : null}
          {result.metadata.transcriptWords ? <span>Transcripcion: {result.metadata.transcriptWords.toLocaleString("es")} pal.</span> : null}
          {result.metadata.outputWords ? <span>Output: {result.metadata.outputWords.toLocaleString("es")} pal.</span> : null}
          {result.metadata.usageTotals?.document.totalTokens ? (
            <span>Doc: {formatTokens(result.metadata.usageTotals.document.totalTokens)}</span>
          ) : null}
          {result.metadata.usageTotals?.all.durationMs ? <span>Tiempo: {formatDuration(result.metadata.usageTotals.all.durationMs)}</span> : null}
          {result.metadata.chunked ? <span>Procesado en {result.metadata.chunks} partes</span> : null}
        </div>

        <article className="markdown-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.markdown}</ReactMarkdown>
        </article>
      </section>
    </div>
  );
}
