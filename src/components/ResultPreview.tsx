import { useState } from "react";
import { Check, Copy, Eye, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DiagramPromptOption, HistoryItem, ProcessResult } from "../api/types";
import { formatDateShort, formatDurationMs, formatModelShort, formatTokens } from "../utils/formatters";
import { DocumentActions } from "./DocumentActions";
import { ModalHeader, ModalShell } from "./ModalShell";
import { useModalBehavior } from "./useModalBehavior";

export type { ProcessResult };

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

function formatMetadataModel(provider: string, model: string) {
  if (provider.toLowerCase() !== "nanogpt") return model;
  return formatModelShort(model);
}

export function ResultPreview({
  result,
  onClose,
  onDiagram,
  diagramPrompts,
  historyItem,
  isDiagramLoading,
  onViewPrompt,
  onViewTranscript
}: ResultPreviewProps) {
  const [copied, setCopied] = useState(false);
  const { descriptionId, titleId } = useModalBehavior(onClose, false);
  const videoText = result.metadata.title || result.metadata.videoUrl || "";
  const uploadDate = result.metadata.uploadDate || historyItem?.uploadDate;

  async function handleCopy() {
    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <ModalShell className="result-modal" labelledBy={titleId} describedBy={descriptionId} onClose={onClose}>
      <ModalHeader
        title="Resultado Markdown"
        titleId={titleId}
        subtitle={
          <span className="subtitle-subtle" id={descriptionId}>
            {result.metadata.processedAt ? `${formatDateShort(result.metadata.processedAt)} · ` : ""}
            {result.metadata.prompt} · {result.metadata.provider} · {formatMetadataModel(result.metadata.provider, result.metadata.model)}
          </span>
        }
      >
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
      </ModalHeader>

      {videoText && result.metadata.videoUrl ? (
        <a className="video-title-link result-video-title" href={result.metadata.videoUrl} target="_blank" rel="noreferrer">
          {videoText}
        </a>
      ) : videoText ? (
        <span className="video-title-text result-video-title">{videoText}</span>
      ) : null}

      <div className="metadata-row">
        {result.metadata.durationText ? <span>Vídeo: {result.metadata.durationText}</span> : null}
        {uploadDate ? <span>Publicado el: {formatDateShort(uploadDate)}</span> : null}
        {result.metadata.transcriptWords ? <span>Transcripcion: {result.metadata.transcriptWords.toLocaleString("es")} pal.</span> : null}
        {result.metadata.outputWords ? <span>Output: {result.metadata.outputWords.toLocaleString("es")} pal.</span> : null}
        {result.metadata.usageTotals?.document.totalTokens ? (
          <span>Doc: {formatTokens(result.metadata.usageTotals.document.totalTokens, "tokens")}</span>
        ) : null}
        {result.metadata.usageTotals?.all.durationMs ? <span>Tiempo: {formatDurationMs(result.metadata.usageTotals.all.durationMs)}</span> : null}
        {result.metadata.chunked ? <span>Procesado en {result.metadata.chunks} partes</span> : null}
      </div>

      <article className="markdown-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.markdown}</ReactMarkdown>
      </article>
    </ModalShell>
  );
}
