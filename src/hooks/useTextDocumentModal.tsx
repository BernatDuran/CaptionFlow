import { useState } from "react";
import { apiFetch } from "../api/client";
import type { HistoryItem, ProcessResult, TextModalConfig } from "../api/types";

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useTextDocumentModal(history: HistoryItem[]) {
  const [textModalConfig, setTextModalConfig] = useState<TextModalConfig | null>(null);
  const [error, setError] = useState("");

  async function handleViewPrompt(filename: string) {
    setError("");
    try {
      const data = await apiFetch<{ promptContent: string | null }>(`/api/results/${encodeURIComponent(filename)}/prompt`);
      if (data.promptContent) {
        setTextModalConfig({
          title: "Prompt utilizado",
          subtitle: "Instrucciones enviadas a la IA para generar este documento",
          content: data.promptContent,
          enableCopy: true,
          isMarkdown: true,
          onDownloadTxt: () => downloadText(filename.replace(/\.md$/i, "-prompt.txt"), data.promptContent || "")
        });
        return;
      }

      setTextModalConfig({
        title: "Prompt no disponible",
        subtitle: "Este documento no tiene prompt original guardado",
        content: "El prompt original no esta guardado para este documento. Solo se guardan los prompts de las nuevas ejecuciones.",
        enableCopy: false
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el prompt.");
    }
  }

  async function handleViewTranscript(filename: string) {
    setError("");
    try {
      const data = await apiFetch<{ transcript: string }>(`/api/results/${encodeURIComponent(filename)}/transcript`);
      const item = history.find((candidate) => candidate.filename === filename);
      const chips: string[] = [];
      if (item?.durationText) chips.push(`Duración: ${item.durationText}`);
      if (item?.transcriptWords) chips.push(`Palabras: ${item.transcriptWords.toLocaleString("es")}`);

      setTextModalConfig({
        title: "Transcripción",
        subtitle: "Texto crudo obtenido del vídeo (sin metadatos)",
        chips,
        content: data.transcript,
        onDownloadTxt: () => downloadText(filename.replace(/\.md$/i, "-transcripcion.txt"), data.transcript)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la transcripción.");
    }
  }

  function closeTextModal() {
    setTextModalConfig(null);
  }

  function metadataFromHistoryResult(
    data: Pick<ProcessResult, "filename" | "markdown" | "downloadUrl" | "pdfUrl"> & {
      metadata?: Partial<ProcessResult["metadata"]> & {
        promptName?: string;
        videoTitle?: string;
        transcriptLanguage?: string;
        transcriptWords?: number;
      };
    }
  ): ProcessResult {
    return {
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
        uploadDate: data.metadata?.uploadDate,
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
    };
  }

  return {
    closeTextModal,
    error,
    handleViewPrompt,
    handleViewTranscript,
    metadataFromHistoryResult,
    textModalConfig
  };
}
