import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, Settings } from "lucide-react";
import { ProcessingStatus, type StatusStep } from "./components/ProcessingStatus";
import { PromptSelector, type PromptSummary } from "./components/PromptSelector";
import { ResultPreview, type ProcessResult } from "./components/ResultPreview";
import { SettingsModal } from "./components/SettingsModal";
import { formatModelDisplayId, type ProviderId } from "./components/ModelCombobox";
import { HistoryPanel, type HistoryItem } from "./components/HistoryPanel";
import { DiagramModal } from "./components/DiagramModal";
import { PromptEditorModal } from "./components/PromptEditorModal";
import { TextDisplayModal } from "./components/TextDisplayModal";
import type { DiagramPromptOption } from "./components/DocumentActions";
import { useModalClose } from "./components/useModalClose";

type ProcessJobResponse = {
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

type ProcessConfirmation = {
  kind: "unknown-limits" | "chunking";
  title: string;
  message: string;
  primaryLabel: string;
  chips?: string[];
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Ha ocurrido un error inesperado.";
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "No se pudo completar la operacion.");
  }

  return payload as T;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatJobStatus(job: Pick<ProcessJobResponse, "step" | "detail">) {
  return job.detail ? `${job.step}: ${job.detail}` : job.step;
}

function getDiagramPromptKind(prompt?: DiagramPromptOption) {
  if (!prompt) return undefined;
  if (/^(flowchart|graph)\b/i.test(prompt.diagramType)) return "flowchart";
  return prompt.diagramType.trim();
}

function formatTokenSummary(tokens?: number | null) {
  if (!tokens) return "[limite desconocido]";
  return `[${Math.round(tokens / 1000)}k tok]`;
}

function formatPlainNumber(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function extractTokenChips(message: string) {
  const required = message.match(/Requiere ~(\d+)/i)?.[1];
  const safeLimit = message.match(/l[ií]mite seguro es ~(\d+)/i)?.[1];
  return [
    required ? `Necesarios: ~${formatPlainNumber(required)} tok` : "",
    safeLimit ? `Limite seguro: ~${formatPlainNumber(safeLimit)} tok` : ""
  ].filter(Boolean);
}

export function App() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<StatusStep | "Completado" | "Error" | "">("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [diagramPrompts, setDiagramPrompts] = useState<DiagramPromptOption[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [diagram, setDiagram] = useState<{ title: string; mermaidCode: string } | null>(null);
  const [diagramFilename, setDiagramFilename] = useState("");
  const [pendingDiagramChoice, setPendingDiagramChoice] = useState<{ filename: string; promptId: string } | null>(null);
  const [activeProviderInfo, setActiveProviderInfo] = useState<{ providerName: string; modelLabel: string; maxInputTokens?: number | null } | null>(null);
  const [isCustomPromptEnabled, setIsCustomPromptEnabled] = useState(false);
  const [customPromptContent, setCustomPromptContent] = useState("");
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [pendingProcessConfirmation, setPendingProcessConfirmation] = useState<ProcessConfirmation | null>(null);
  const [textModalConfig, setTextModalConfig] = useState<{
    title: string;
    subtitle?: string;
    chips?: React.ReactNode[];
    content: string;
    onDownloadTxt?: () => void;
    enableCopy?: boolean;
    isMarkdown?: boolean;
  } | null>(null);

  const { handleBackdropClick: handlePendingDiagramBackdropClick } = useModalClose(() => setPendingDiagramChoice(null), Boolean(pendingDiagramChoice));
  const { handleBackdropClick: handleProcessConfirmationBackdropClick } = useModalClose(cancelProcessConfirmation, Boolean(pendingProcessConfirmation));

  useEffect(() => {
    async function loadActiveProvider() {
      try {
        const data = await apiFetch<{ providers: {id: ProviderId, name: string}[], activeProvider: ProviderId, selectedModels: Record<string, string> }>("/api/providers");
        const provider = data.providers.find((p) => p.id === data.activeProvider);
        const modelId = data.selectedModels[data.activeProvider];
        if (provider && modelId) {
          const modelsData = await apiFetch<{ models: {id: string, label: string, limits?: { maxInputTokens?: number | null }}[] }>(`/api/models?provider=${data.activeProvider}`);
          const model = modelsData.models.find((m) => m.id === modelId);
          setActiveProviderInfo({
            providerName: provider.name,
            modelLabel: formatModelDisplayId(model ? model.id : modelId, data.activeProvider),
            maxInputTokens: model?.limits?.maxInputTokens
          });
        }
      } catch (err) {
        // Ignorar error para no bloquear la interfaz
      }
    }
    void loadActiveProvider();
  }, [isSettingsOpen]);

  function loadPrompts() {
    setIsLoadingPrompts(true);
    return apiFetch<{ prompts: PromptSummary[] }>("/api/prompts")
      .then((data) => {
        setPrompts(data.prompts);
        setSelectedPrompt((prev) => data.prompts.some(p => p.id === prev) ? prev : (data.prompts[0]?.id || ""));
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setIsLoadingPrompts(false));
  }

  useEffect(() => {
    void loadPrompts();
  }, []);

  useEffect(() => {
    apiFetch<{ prompts: DiagramPromptOption[] }>("/api/diagram-prompts")
      .then((data) => setDiagramPrompts(data.prompts))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  function loadHistory() {
    setIsHistoryLoading(true);
    return apiFetch<{ items: HistoryItem[] }>("/api/history")
      .then((data) => setHistory(data.items))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setIsHistoryLoading(false));
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  const canProcess = useMemo(
    () => youtubeUrl.trim().length > 0 && selectedPrompt && !isProcessing && !isLoadingPrompts,
    [youtubeUrl, selectedPrompt, isProcessing, isLoadingPrompts]
  );

  class JobError extends Error {
    constructor(message: string, public code?: string) {
      super(message);
      this.name = "JobError";
    }
  }

  async function pollProcessJob(jobId: string) {
    for (;;) {
      await wait(800);
      const job = await apiFetch<ProcessJobResponse>(`/api/process/${encodeURIComponent(jobId)}`);
      setStatus(formatJobStatus(job));

      if (job.status === "completed") {
        if (!job.result) {
          throw new Error("El proceso termino sin devolver un documento.");
        }
        return job.result;
      }

      if (job.status === "error") {
        throw new JobError(job.error?.message || "No se pudo procesar el video.", job.error?.code);
      }
    }
  }

  function handleToggleCustomPrompt(checked: boolean) {
    if (checked) {
      const prompt = prompts.find(p => p.id === selectedPrompt);
      if (prompt) {
        setCustomPromptContent(prompt.content);
        setIsEditorModalOpen(true);
      }
    } else {
      setIsCustomPromptEnabled(false);
      setCustomPromptContent("");
    }
  }

  function handleSaveCustomPrompt(content: string) {
    setCustomPromptContent(content);
    setIsCustomPromptEnabled(true);
    setIsEditorModalOpen(false);
  }

  function handleCancelCustomPrompt() {
    setIsEditorModalOpen(false);
    setIsCustomPromptEnabled(false);
    setCustomPromptContent("");
  }

  function cancelProcessConfirmation() {
    setPendingProcessConfirmation(null);
    setStatus("Cancelado");
  }

  function confirmProcessWithChunking() {
    setPendingProcessConfirmation(null);
    void handleProcess(undefined, true);
  }

  async function handleProcess(e?: React.FormEvent, ignoreLimits = false) {
    if (e) e.preventDefault();
    if (!canProcess) return;
    
    setError("");
    setResult(null);
    setIsProcessing(true);
    setStatus("Validando URL");

    try {
      const started = await apiFetch<ProcessJobResponse>("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          youtubeUrl, 
          promptId: selectedPrompt,
          customPromptContent: isCustomPromptEnabled ? customPromptContent : undefined,
          ignoreLimits
        })
      });

      setStatus(formatJobStatus(started));
      const jobId = started.jobId || started.id;
      if (!jobId) {
        throw new Error("No se pudo iniciar el proceso.");
      }

      const data = await pollProcessJob(jobId);
      setStatus("Completado");
      setResult(data);
      void loadHistory();
    } catch (err) {
      if (err instanceof JobError && err.code === "UNKNOWN_LIMITS") {
        setIsProcessing(false);
        setStatus("Requiere confirmación");
        setPendingProcessConfirmation({
          kind: "unknown-limits",
          title: "Limites de contexto desconocidos",
          message: "El modelo seleccionado no tiene limites de contexto registrados. Puedes continuar, pero el proceso podria fallar si la transcripcion es muy larga.",
          primaryLabel: "Continuar"
        });
        return;
      }
      if (err instanceof JobError && err.code === "TOKEN_LIMIT_EXCEEDED") {
        setIsProcessing(false);
        setStatus("Requiere confirmación");
        setPendingProcessConfirmation({
          kind: "chunking",
          title: "Procesar con chunking",
          message: `${err.message} CaptionFlow puede trocear la transcripcion en partes y generar un documento final a partir de ellas. En videos extremadamente largos tambien podria fallar.`,
          primaryLabel: "Usar chunking",
          chips: extractTokenChips(err.message)
        });
        return;
      }
      setStatus("Error");
      setError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleOpenHistory(filename: string) {
    setError("");
    try {
      const data = await apiFetch<Pick<ProcessResult, "filename" | "markdown" | "downloadUrl" | "pdfUrl"> & { metadata?: Partial<ProcessResult["metadata"]> & { promptName?: string; videoTitle?: string; transcriptLanguage?: string; transcriptWords?: number } }>(
        `/api/results/${encodeURIComponent(filename)}`
      );
      setResult({
        ...data,
        metadata: {
          provider: data.metadata?.provider || "Historial",
          model: data.metadata?.model || "Documento guardado",
          prompt: data.metadata?.prompt || data.metadata?.promptName || "Documento historico",
          title: data.metadata?.title || data.metadata?.videoTitle,
          videoUrl: data.metadata?.videoUrl,
          channelName: data.metadata?.channelName,
          durationSeconds: data.metadata?.durationSeconds,
          durationText: data.metadata?.durationText,
          transcriptLanguage: data.metadata?.transcriptLanguage,
          transcriptWords: data.metadata?.transcriptWords,
          outputWords: data.metadata?.outputWords,
          processedAt: data.metadata?.processedAt,
          transcriptRef: data.metadata?.transcriptRef || "-",
          transcriptSource: data.metadata?.transcriptSource || "-",
          chunked: Boolean(data.metadata?.chunked),
          chunks: data.metadata?.chunks || 1,
          usageTotals: data.metadata?.usageTotals
        }
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleOpenExistingDiagram(filename: string, promptId: string) {
    setError("");
    setPendingDiagramChoice(null);
    try {
      const prompt = diagramPrompts.find((option) => option.id === promptId);
      const kind = getDiagramPromptKind(prompt);
      const params = new URLSearchParams({ promptId });
      if (kind) params.set("kind", kind);
      const data = await apiFetch<{ mermaid: string }>(`/api/diagram/${encodeURIComponent(filename)}?${params.toString()}`);
      setDiagram({ title: filename, mermaidCode: data.mermaid });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDiagram(filename: string, promptId: string, mode: "confirm" | "generate" = "generate") {
    if (mode === "confirm") {
      setPendingDiagramChoice({ filename, promptId });
      return;
    }

    setError("");
    setPendingDiagramChoice(null);
    setDiagramFilename(filename);
    try {
      const data = await apiFetch<{ mermaid: string }>(`/api/diagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, promptId })
      });
      setDiagram({ title: filename, mermaidCode: data.mermaid });
      void loadHistory();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDiagramFilename("");
    }
  }

  async function handleViewPrompt(filename: string) {
    try {
      const data = await apiFetch<{ promptContent: string | null }>(`/api/results/${encodeURIComponent(filename)}/prompt`);
      if (data.promptContent) {
        setTextModalConfig({
          title: "Prompt utilizado",
          subtitle: "Instrucciones enviadas a la IA para generar este documento",
          content: data.promptContent,
          enableCopy: true,
          isMarkdown: true,
          onDownloadTxt: () => {
            const blob = new Blob([data.promptContent!], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename.replace(/\.md$/i, "-prompt.txt");
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      } else {
        alert("El prompt original no está guardado para este documento. Solo se guardan los prompts de las nuevas ejecuciones.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleViewTranscript(filename: string) {
    try {
      const data = await apiFetch<{ transcript: string }>(`/api/results/${encodeURIComponent(filename)}/transcript`);
      const item = history.find((h) => h.filename === filename);
      const chips: React.ReactNode[] = [];
      if (item?.durationText) chips.push(`Duración: ${item.durationText}`);
      if (item?.transcriptWords) chips.push(`Palabras: ${item.transcriptWords.toLocaleString("es")}`);
      
      setTextModalConfig({
        title: "Transcripción",
        subtitle: "Texto crudo obtenido del vídeo (sin metadatos)",
        chips,
        content: data.transcript,
        onDownloadTxt: () => {
          const blob = new Blob([data.transcript], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename.replace(/\.md$/i, "-transcripcion.txt");
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <main className="app-shell">
      <button className="icon-button settings-button" type="button" aria-label="Abrir configuracion" onClick={() => setIsSettingsOpen(true)}>
        <Settings size={20} />
      </button>

      <section className="workspace">
        <div className="title-block">
          <h1>CaptionFlow</h1>
          <p>Convierte transcripciones de YouTube en documentos Markdown listos para usar.</p>
        </div>

        <form
          className="process-panel"
          onSubmit={(event) => {
            event.preventDefault();
            if (canProcess) void handleProcess();
          }}
        >
          <label className="field">
            <span>URL de YouTube</span>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={isProcessing}
            />
            {activeProviderInfo ? (
              <small className="provider-summary">
                <span>{activeProviderInfo.providerName} · {activeProviderInfo.modelLabel}</span>
                <span>{formatTokenSummary(activeProviderInfo.maxInputTokens)}</span>
              </small>
            ) : null}
          </label>

          <PromptSelector 
            prompts={prompts} 
            value={selectedPrompt} 
            onChange={(val) => {
              setSelectedPrompt(val);
              if (isCustomPromptEnabled) {
                setIsCustomPromptEnabled(false);
                setCustomPromptContent("");
              }
            }} 
            disabled={isProcessing || isLoadingPrompts} 
            isCustomizing={isCustomPromptEnabled}
            onToggleCustomizing={handleToggleCustomPrompt}
          />

          <button className="primary-button" type="submit" disabled={!canProcess}>
            {isProcessing ? <Loader2 className="spin" size={18} /> : null}
            Procesar
          </button>
        </form>

        <ProcessingStatus status={status} isProcessing={isProcessing} />

        {error ? (
          <div className="error-message" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        <HistoryPanel
          items={history}
          onOpen={handleOpenHistory}
          onDiagram={handleDiagram}
          onViewTranscript={handleViewTranscript}
          diagramPrompts={diagramPrompts}
          isLoading={isHistoryLoading}
          diagramFilename={diagramFilename}
        />
      </section>

      {result ? (
        <ResultPreview
          result={result}
          onClose={() => setResult(null)}
          onDiagram={handleDiagram}
          onViewPrompt={handleViewPrompt}
          onViewTranscript={handleViewTranscript}
          diagramPrompts={diagramPrompts}
          historyItem={history.find((item) => item.filename === result.filename)}
          isDiagramLoading={Boolean(diagramFilename)}
        />
      ) : null}
      {diagram ? <DiagramModal title={diagram.title} mermaidCode={diagram.mermaidCode} onClose={() => setDiagram(null)} /> : null}
      {pendingProcessConfirmation ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={pendingProcessConfirmation.title} onClick={handleProcessConfirmationBackdropClick}>
          <section className="confirm-modal process-confirm-modal">
            <div className="process-confirm-copy">
              <h2>
                <span className="process-confirm-icon" aria-hidden="true">
                  <AlertTriangle size={18} />
                </span>
                {pendingProcessConfirmation.title}
              </h2>
              <p>{pendingProcessConfirmation.message}</p>
              {pendingProcessConfirmation.chips?.length ? (
                <div className="process-confirm-chips">
                  {pendingProcessConfirmation.chips.map((chip) => (
                    <span key={chip}>{chip}</span>
                  ))}
                </div>
              ) : null}
              {pendingProcessConfirmation.kind === "chunking" ? (
                <div className="process-confirm-note">
                  Se generaran resumenes por partes y despues un documento final con ese material intermedio.
                </div>
              ) : null}
            </div>
            <div className="confirm-actions">
              <button className="secondary-button" type="button" onClick={cancelProcessConfirmation}>
                Cancelar
              </button>
              <button className="primary-button subtle-primary-button" type="button" onClick={confirmProcessWithChunking}>
                {pendingProcessConfirmation.primaryLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {pendingDiagramChoice ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Diagrama existente" onClick={handlePendingDiagramBackdropClick}>
          <section className="confirm-modal">
            <h2>Diagrama ya generado</h2>
            <p>Este documento ya tiene un diagrama guardado. Puedes abrir el existente o generar uno nuevo.</p>
            <div className="confirm-actions">
              <button className="secondary-button" type="button" onClick={() => setPendingDiagramChoice(null)}>
                Cancelar
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void handleOpenExistingDiagram(pendingDiagramChoice.filename, pendingDiagramChoice.promptId)}
              >
                Abrir existente
              </button>
              <button
                className="primary-button subtle-primary-button"
                type="button"
                onClick={() => void handleDiagram(pendingDiagramChoice.filename, pendingDiagramChoice.promptId, "generate")}
              >
                Generar nuevo
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {isEditorModalOpen ? (
        <PromptEditorModal
          initialPrompt={customPromptContent}
          onSave={handleSaveCustomPrompt}
          onClose={handleCancelCustomPrompt}
        />
      ) : null}
      {textModalConfig ? (
        <TextDisplayModal
          {...textModalConfig}
          onClose={() => setTextModalConfig(null)}
        />
      ) : null}
      {isSettingsOpen ? (
        <SettingsModal 
          onClose={() => setIsSettingsOpen(false)} 
          onPromptsChanged={loadPrompts}
        />
      ) : null}
      {diagramFilename ? (
        <div className="thinking-toast" role="status" aria-live="polite">
          <Loader2 className="spin" size={17} />
          Generando diagrama
        </div>
      ) : null}
    </main>
  );
}
