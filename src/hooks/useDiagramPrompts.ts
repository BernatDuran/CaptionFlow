import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { DiagramPromptOption } from "../api/types";

export function useDiagramPrompts() {
  const [diagramPrompts, setDiagramPrompts] = useState<DiagramPromptOption[]>([]);
  const [error, setError] = useState("");

  const loadDiagramPrompts = useCallback(async () => {
    setError("");
    try {
      const data = await apiFetch<{ prompts: DiagramPromptOption[] }>("/api/diagram-prompts");
      setDiagramPrompts(data.prompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los prompts de diagrama.");
    }
  }, []);

  useEffect(() => {
    void loadDiagramPrompts();
  }, [loadDiagramPrompts]);

  return { diagramPrompts, error, loadDiagramPrompts };
}
