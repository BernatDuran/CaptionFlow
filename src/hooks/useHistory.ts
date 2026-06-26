import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { HistoryItem } from "../api/types";

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ items: HistoryItem[] }>("/api/history");
      setHistory(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return { error, history, isHistoryLoading, loadHistory };
}
