import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, BarChart3, Loader2, Settings } from "lucide-react";
import { apiFetch } from "./api/client";
import type { ProcessResult } from "./api/types";
import { ProcessingStatus } from "./components/ProcessingStatus";
import { PromptSelector } from "./components/PromptSelector";
import { ResultPreview } from "./components/ResultPreview";
import { SettingsModal } from "./components/SettingsModal";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { HistoryPanel } from "./components/HistoryPanel";
import { DiagramModal } from "./components/DiagramModal";
import { PromptEditorModal } from "./components/PromptEditorModal";
import { TextDisplayModal } from "./components/TextDisplayModal";
import { Button, IconButton } from "./components/ui";
import { ExistingDiagramConfirmDialog, ProcessConfirmationDialog } from "./components/AppDialogs";
import { useCustomPrompt } from "./hooks/useCustomPrompt";
import { useDiagramActions } from "./hooks/useDiagramActions";
import { useDiagramPrompts } from "./hooks/useDiagramPrompts";
import { useHistory } from "./hooks/useHistory";
import { useProcessJob } from "./hooks/useProcessJob";
import { usePrompts } from "./hooks/usePrompts";
import { useProviderSummary } from "./hooks/useProviderSummary";
import { useTextDocumentModal } from "./hooks/useTextDocumentModal";

export function App() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState<"main" | "analytics">("main");

  const { error: promptsError, isLoadingPrompts, loadPrompts, prompts, selectedPrompt, setSelectedPrompt } = usePrompts();
  const { diagramPrompts, error: diagramPromptsError } = useDiagramPrompts();
  const { error: historyError, history, isHistoryLoading, loadHistory } = useHistory();
  const {
    activeProviderInfo,
    error: providerError,
    isAnalyticsEnabled,
    loadProviderSummary,
    setIsAnalyticsEnabled
  } = useProviderSummary(isSettingsOpen);
  const customPrompt = useCustomPrompt(prompts, selectedPrompt);
  const {
    cancelProcessConfirmation,
    confirmProcessWithChunking,
    error: processError,
    isProcessing,
    pendingProcessConfirmation,
    result,
    setError: setProcessError,
    setResult,
    startProcess,
    status
  } = useProcessJob({ onCompleted: loadHistory });
  const diagramActions = useDiagramActions({ diagramPrompts, onDiagramChanged: loadHistory });
  const textModal = useTextDocumentModal(history);

  useEffect(() => {
    if (!isAnalyticsEnabled && activeView === "analytics") {
      setActiveView("main");
    }
  }, [activeView, isAnalyticsEnabled]);

  const canProcess = useMemo(
    () => youtubeUrl.trim().length > 0 && Boolean(selectedPrompt) && !isProcessing && !isLoadingPrompts,
    [isLoadingPrompts, isProcessing, selectedPrompt, youtubeUrl]
  );

  const visibleError =
    processError ||
    promptsError ||
    diagramPromptsError ||
    historyError ||
    providerError ||
    diagramActions.error ||
    textModal.error;

  function handlePromptChange(value: string) {
    setSelectedPrompt(value);
    customPrompt.resetCustomPrompt();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canProcess) return;
    void startProcess({
      youtubeUrl,
      promptId: selectedPrompt,
      customPromptContent: customPrompt.isCustomPromptEnabled ? customPrompt.customPromptContent : undefined
    });
  }

  async function handleOpenHistory(filename: string) {
    setProcessError("");
    try {
      const data = await apiFetch<
        Pick<ProcessResult, "filename" | "markdown" | "downloadUrl" | "pdfUrl"> & {
          metadata?: Partial<ProcessResult["metadata"]> & {
            promptName?: string;
            videoTitle?: string;
            transcriptLanguage?: string;
            transcriptWords?: number;
          };
        }
      >(`/api/results/${encodeURIComponent(filename)}`);
      setResult(textModal.metadataFromHistoryResult(data));
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : "No se pudo abrir el documento.");
    }
  }

  return (
    <main className="app-shell">
      {activeView !== "analytics" ? (
        <div className="top-action-buttons">
          {isAnalyticsEnabled ? (
            <IconButton type="button" aria-label="Abrir analitica" onClick={() => setActiveView("analytics")}>
              <BarChart3 size={20} />
            </IconButton>
          ) : null}
          <IconButton type="button" aria-label="Abrir configuracion" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={20} />
          </IconButton>
        </div>
      ) : null}

      {activeView === "analytics" && isAnalyticsEnabled ? (
        <AnalyticsDashboard onBack={() => setActiveView("main")} />
      ) : (
        <section className="workspace">
          <div className="title-block">
            <h1>CaptionFlow</h1>
            <p>Convierte transcripciones de YouTube en documentos Markdown listos para usar.</p>
          </div>

          <form className="process-panel" onSubmit={handleSubmit}>
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
                  <span>
                    {activeProviderInfo.providerName} · {activeProviderInfo.modelLabel}
                  </span>
                  <span>{activeProviderInfo.tokenSummary}</span>
                </small>
              ) : null}
            </label>

            <PromptSelector
              prompts={prompts}
              value={selectedPrompt}
              onChange={handlePromptChange}
              disabled={isProcessing || isLoadingPrompts}
              isCustomizing={customPrompt.isCustomPromptEnabled}
              onToggleCustomizing={customPrompt.handleToggleCustomPrompt}
            />

            <Button variant="primary" type="submit" disabled={!canProcess}>
              {isProcessing ? <Loader2 className="spin" size={18} /> : null}
              Procesar
            </Button>
          </form>

          <ProcessingStatus status={status} isProcessing={isProcessing} />

          {visibleError ? (
            <div className="error-message" role="alert">
              <AlertCircle size={18} />
              <span>{visibleError}</span>
            </div>
          ) : null}

          <HistoryPanel
            items={history}
            onOpen={handleOpenHistory}
            onDiagram={diagramActions.handleDiagram}
            onViewTranscript={textModal.handleViewTranscript}
            diagramPrompts={diagramPrompts}
            isLoading={isHistoryLoading}
            diagramFilename={diagramActions.diagramFilename}
            onHistoryChanged={loadHistory}
          />
        </section>
      )}

      {result ? (
        <ResultPreview
          result={result}
          onClose={() => setResult(null)}
          onDiagram={diagramActions.handleDiagram}
          onViewPrompt={textModal.handleViewPrompt}
          onViewTranscript={textModal.handleViewTranscript}
          diagramPrompts={diagramPrompts}
          historyItem={history.find((item) => item.filename === result.filename)}
          isDiagramLoading={Boolean(diagramActions.diagramFilename)}
        />
      ) : null}

      {diagramActions.diagram ? (
        <DiagramModal
          title={diagramActions.diagram.title}
          mermaidCode={diagramActions.diagram.mermaidCode}
          onClose={diagramActions.closeDiagram}
        />
      ) : null}

      <ProcessConfirmationDialog
        confirmation={pendingProcessConfirmation}
        onCancel={cancelProcessConfirmation}
        onConfirm={confirmProcessWithChunking}
      />

      <ExistingDiagramConfirmDialog
        choice={diagramActions.pendingDiagramChoice}
        onCancel={() => diagramActions.setPendingDiagramChoice(null)}
        onOpenExisting={(choice) => void diagramActions.handleOpenExistingDiagram(choice.filename, choice.promptId)}
        onGenerateNew={(choice) => void diagramActions.handleDiagram(choice.filename, choice.promptId, "generate")}
      />

      {customPrompt.isEditorModalOpen ? (
        <PromptEditorModal
          initialPrompt={customPrompt.customPromptContent}
          onSave={customPrompt.handleSaveCustomPrompt}
          onClose={customPrompt.resetCustomPrompt}
        />
      ) : null}

      {textModal.textModalConfig ? (
        <TextDisplayModal {...textModal.textModalConfig} onClose={textModal.closeTextModal} />
      ) : null}

      {isSettingsOpen ? (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onPromptsChanged={loadPrompts}
          onSettingsChanged={(settings) => {
            setIsAnalyticsEnabled(Boolean(settings.analyticsEnabled));
            void loadProviderSummary();
          }}
        />
      ) : null}

      {diagramActions.diagramFilename ? (
        <div className="thinking-toast" role="status" aria-live="polite">
          <Loader2 className="spin" size={17} />
          Generando diagrama
        </div>
      ) : null}
    </main>
  );
}
