import { useState } from "react";
import { apiFetch } from "../api/client";
import type { DiagramPromptOption } from "../api/types";

type PendingDiagramChoice = {
  filename: string;
  promptId: string;
};

function getDiagramPromptKind(prompt?: DiagramPromptOption) {
  if (!prompt) return undefined;
  if (/^(flowchart|graph)\b/i.test(prompt.diagramType)) return "flowchart";
  return prompt.diagramType.trim();
}

export function useDiagramActions(input: { diagramPrompts: DiagramPromptOption[]; onDiagramChanged?: () => void }) {
  const [diagram, setDiagram] = useState<{ title: string; mermaidCode: string } | null>(null);
  const [diagramFilename, setDiagramFilename] = useState("");
  const [pendingDiagramChoice, setPendingDiagramChoice] = useState<PendingDiagramChoice | null>(null);
  const [error, setError] = useState("");

  async function handleOpenExistingDiagram(filename: string, promptId: string) {
    setError("");
    setPendingDiagramChoice(null);
    try {
      const prompt = input.diagramPrompts.find((option) => option.id === promptId);
      const kind = getDiagramPromptKind(prompt);
      const params = new URLSearchParams({ promptId });
      if (kind) params.set("kind", kind);
      const data = await apiFetch<{ mermaid: string }>(`/api/diagram/${encodeURIComponent(filename)}?${params.toString()}`);
      setDiagram({ title: filename, mermaidCode: data.mermaid });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el diagrama.");
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
      const data = await apiFetch<{ mermaid: string }>("/api/diagram", {
        method: "POST",
        json: { filename, promptId }
      });
      setDiagram({ title: filename, mermaidCode: data.mermaid });
      input.onDiagramChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el diagrama.");
    } finally {
      setDiagramFilename("");
    }
  }

  return {
    closeDiagram: () => setDiagram(null),
    diagram,
    diagramFilename,
    error,
    handleDiagram,
    handleOpenExistingDiagram,
    pendingDiagramChoice,
    setPendingDiagramChoice
  };
}
