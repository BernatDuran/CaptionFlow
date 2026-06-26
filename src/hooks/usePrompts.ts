import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { PromptSummary } from "../api/types";

export function usePrompts() {
  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);
  const [error, setError] = useState("");

  const loadPrompts = useCallback(async () => {
    setIsLoadingPrompts(true);
    setError("");
    try {
      const data = await apiFetch<{ prompts: PromptSummary[] }>("/api/prompts");
      setPrompts(data.prompts);
      setSelectedPrompt((prev) => (data.prompts.some((prompt) => prompt.id === prev) ? prev : data.prompts[0]?.id || ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los prompts.");
    } finally {
      setIsLoadingPrompts(false);
    }
  }, []);

  useEffect(() => {
    void loadPrompts();
  }, [loadPrompts]);

  return { error, isLoadingPrompts, loadPrompts, prompts, selectedPrompt, setSelectedPrompt };
}
