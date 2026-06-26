import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Eye, FileText, GitFork, Loader2, Trash2 } from "lucide-react";
import type { DiagramPromptOption, HistoryRun } from "../api/types";
import { formatDurationMs, formatModelShort, formatTokens } from "../utils/formatters";
import { DownloadModal } from "./DownloadModal";

export type { DiagramPromptOption };

type DocumentActionsProps = {
  filename: string;
  downloadUrl: string;
  pdfUrl: string;
  diagramPrompts: DiagramPromptOption[];
  onOpen: (filename: string) => void;
  onDiagram: (filename: string, promptId: string, mode?: "confirm" | "generate") => void;
  hasDiagram?: boolean;
  existingDiagramKind?: string;
  existingDiagramKinds?: string[];
  aiRuns?: HistoryRun[];
  showOpen?: boolean;
  disabled?: boolean;
  onTranscript?: (filename: string) => void;
  onDeleteResult?: (filename: string) => void;
  onDeleteDiagram?: (filename: string, prompt: DiagramPromptOption) => void;
  align?: "left" | "right";
};

export function DocumentActions({
  filename,
  downloadUrl,
  pdfUrl,
  diagramPrompts,
  onOpen,
  onDiagram,
  hasDiagram = false,
  existingDiagramKind,
  existingDiagramKinds = existingDiagramKind ? [existingDiagramKind] : [],
  aiRuns = [],
  showOpen = true,
  disabled = false,
  onTranscript,
  onDeleteResult,
  onDeleteDiagram,
  align = "right"
}: DocumentActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDiagramPickerOpen, setIsDiagramPickerOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<"markdown" | "pdf" | "diagram" | "">("");
  const [downloadModal, setDownloadModal] = useState<{ isOpen: boolean; url: string; type: "markdown" | "pdf" | null }>({
    isOpen: false,
    url: "",
    type: null
  });
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function triggerDownloadClick(url: string, action: "markdown" | "pdf") {
    setIsOpen(false);
    setIsDiagramPickerOpen(false);
    setDownloadModal({ isOpen: true, url, type: action });
  }

  function executeDownload() {
    if (!downloadModal.url || !downloadModal.type) return;
    setBusyAction(downloadModal.type);
    window.setTimeout(() => setBusyAction(""), 1600);
    window.location.href = downloadModal.url;
  }

  function getPromptKind(prompt: DiagramPromptOption) {
    if (/^(flowchart|graph)\b/i.test(prompt.diagramType)) return "flowchart";
    return prompt.diagramType.trim();
  }

  function triggerDiagram(promptId: string) {
    setIsOpen(false);
    setIsDiagramPickerOpen(false);
    const prompt = diagramPrompts.find((option) => option.id === promptId);
    const isGeneratedType = prompt ? existingDiagramKinds.includes(getPromptKind(prompt)) : hasDiagram;
    if (isGeneratedType) {
      onDiagram(filename, promptId, "confirm");
      return;
    }

    setBusyAction("diagram");
    onDiagram(filename, promptId, "generate");
    window.setTimeout(() => setBusyAction(""), 2400);
  }

  function getLatestDiagramRun(prompt: DiagramPromptOption) {
    const kind = getPromptKind(prompt);
    return [...aiRuns]
      .filter((run) => run.operation === "diagram_generation" && (run.diagramType === kind || run.diagramPromptId === prompt.id))
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  }

  const isBusy = Boolean(busyAction) || disabled;

  return (
    <div className="actions-menu" ref={menuRef}>
      <button className="secondary-button compact-options-button" type="button" disabled={isBusy} onClick={() => setIsOpen((current) => !current)}>
        {busyAction ? <Loader2 className="spin" size={17} /> : <Download size={17} />}
        {busyAction ? "Preparando" : "Opciones"}
        <ChevronDown size={16} />
      </button>

      {isOpen ? (
        <div className={`actions-popover align-${align}${isDiagramPickerOpen ? " diagrams-open" : ""}`} role="menu">
          {showOpen ? (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsDiagramPickerOpen(false);
                onOpen(filename);
              }}
            >
              <Eye size={16} />
              Ver
            </button>
          ) : null}
          {onTranscript ? (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsDiagramPickerOpen(false);
                onTranscript(filename);
              }}
            >
              <FileText size={16} />
              Transcripción
            </button>
          ) : null}
          <button role="menuitem" type="button" onClick={() => triggerDownloadClick(downloadUrl, "markdown")}>
            <FileText size={16} />
            Markdown
          </button>
          <button role="menuitem" type="button" onClick={() => triggerDownloadClick(pdfUrl, "pdf")}>
            <FileText size={16} />
            PDF
          </button>
          <button role="menuitem" type="button" onClick={() => setIsDiagramPickerOpen((current) => !current)}>
            <GitFork size={16} />
            Diagrama
            <ChevronDown size={14} />
          </button>
          {isDiagramPickerOpen ? (
            <div className="diagram-prompt-list" role="group" aria-label="Tipos de diagrama">
              {diagramPrompts.map((prompt) => {
                const isGeneratedType = hasDiagram && existingDiagramKinds.includes(getPromptKind(prompt));
                const latestRun = getLatestDiagramRun(prompt);
                const runSummary =
                  latestRun && latestRun.model
                    ? `${formatModelShort(latestRun.model)} · ${formatTokens(latestRun.totalTokens) || "sin tokens"} · ${formatDurationMs(latestRun.durationMs)}`
                    : "";
                return (
                  <div className="diagram-prompt-row" key={prompt.id}>
                    <button className="diagram-prompt-action" type="button" onClick={() => triggerDiagram(prompt.id)}>
                      <span>
                        {prompt.name}
                        {runSummary ? <small>{runSummary}</small> : null}
                      </span>
                      {isGeneratedType ? <i aria-label="Ya generado" title="Ya generado para este tipo" /> : null}
                    </button>
                    {isGeneratedType && onDeleteDiagram ? (
                      <button
                        className="diagram-delete-button"
                        type="button"
                        aria-label={`Eliminar diagrama ${prompt.name}`}
                        title={`Eliminar diagrama ${prompt.name}`}
                        onClick={() => {
                          setIsOpen(false);
                          setIsDiagramPickerOpen(false);
                          onDeleteDiagram(filename, prompt);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {onDeleteResult ? (
            <>
              <div className="actions-separator" role="separator" />
              <button
                className="danger-menu-item"
                role="menuitem"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsDiagramPickerOpen(false);
                  onDeleteResult(filename);
                }}
              >
                <Trash2 size={16} />
                Eliminar
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <DownloadModal
        isOpen={downloadModal.isOpen}
        type={downloadModal.type || "markdown"}
        url={downloadModal.url}
        onConfirm={executeDownload}
        onCancel={() => setDownloadModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
