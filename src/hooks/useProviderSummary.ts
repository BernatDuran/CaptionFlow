import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { ProviderId, ProvidersResponse } from "../api/types";
import { formatModelDisplayId, formatTokenLimitSummary } from "../utils/formatters";

export type ActiveProviderInfo = {
  providerName: string;
  modelLabel: string;
  maxInputTokens?: number | null;
  tokenSummary: string;
};

export function useProviderSummary(refreshKey: unknown) {
  const [activeProviderInfo, setActiveProviderInfo] = useState<ActiveProviderInfo | null>(null);
  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(false);
  const [error, setError] = useState("");

  const loadProviderSummary = useCallback(async () => {
    setError("");
    try {
      const data = await apiFetch<ProvidersResponse>("/api/providers");
      setIsAnalyticsEnabled(Boolean(data.analyticsEnabled));
      const provider = data.providers.find((item) => item.id === data.activeProvider);
      const modelId = data.selectedModels[data.activeProvider];
      if (!provider || !modelId) return;

      const modelsData = await apiFetch<{ models: { id: string; label: string; limits?: { maxInputTokens?: number | null } }[] }>(
        `/api/models?provider=${data.activeProvider}`
      );
      const model = modelsData.models.find((item) => item.id === modelId);
      setActiveProviderInfo({
        providerName: provider.name,
        modelLabel: formatModelDisplayId(model?.id || modelId, data.activeProvider as ProviderId),
        maxInputTokens: model?.limits?.maxInputTokens,
        tokenSummary: formatTokenLimitSummary(model?.limits?.maxInputTokens)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el proveedor activo.");
    }
  }, []);

  useEffect(() => {
    void loadProviderSummary();
  }, [loadProviderSummary, refreshKey]);

  return { activeProviderInfo, error, isAnalyticsEnabled, loadProviderSummary, setIsAnalyticsEnabled };
}
