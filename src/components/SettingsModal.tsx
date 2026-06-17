import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown, Info, KeyRound, RefreshCw, X, Settings2, FileText, Sliders, FolderOpen } from "lucide-react";
import { ModelCombobox, type ModelOption } from "./ModelCombobox";
import { PromptsSettings } from "./PromptsSettings";
import { useModalClose } from "./useModalClose";

type ProviderId = "openai" | "google" | "nanogpt";

type Provider = {
  id: ProviderId;
  name: string;
  configured: boolean;
};

type Settings = {
  activeProvider: ProviderId;
  selectedModels: Partial<Record<ProviderId, string>>;
  adaptiveChunkingEnabled?: boolean;
  minimumModelContextTokens?: number;
  outputRootDir?: string;
};

type SettingsModalProps = {
  onClose: () => void;
  onPromptsChanged?: () => void;
};

type ProvidersResponse = {
  providers: Provider[];
  activeProvider: ProviderId;
  selectedModels: Settings["selectedModels"];
  adaptiveChunkingEnabled?: boolean;
  minimumModelContextTokens?: number;
  outputRootDir?: string;
};

const CONTEXT_PRESETS = [4000, 8000, 16000, 32000, 64000, 128000, 256000];

function formatPreset(tokens: number) {
  return `${Math.round(tokens / 1000)}k`;
}

type ContextPresetOption = {
  value: number;
  label: string;
  count: number;
  unknownCount: number;
};

type ContextPresetComboboxProps = {
  value: number;
  options: ContextPresetOption[];
  onChange: (value: number) => void;
};

function ContextCountChip({ option }: { option?: ContextPresetOption }) {
  const count = option?.count ?? 0;
  const unknownCount = option?.unknownCount ?? 0;

  return (
    <span
      className="minimum-context-count-chip"
      title={
        unknownCount > 0
          ? `${count} modelos cumplen el criterio; ${unknownCount} sin contexto informado.`
          : `${count} modelos cumplen el criterio.`
      }
    >
      <span>{count}</span>
      {unknownCount > 0 ? <span className="minimum-context-count-chip-unknown">+ {unknownCount} s/c</span> : null}
    </span>
  );
}

function ContextPresetCombobox({ value, options, onChange }: ContextPresetComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="context-combobox" ref={rootRef}>
      <button className="context-combobox-trigger" type="button" onClick={() => setIsOpen((current) => !current)}>
        <span>{selected?.label || formatPreset(value)}</span>
        <ContextCountChip option={selected} />
        <ChevronDown size={16} />
      </button>

      {isOpen ? (
        <div className="context-combobox-popover" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>
              <ContextCountChip option={option} />
              {option.value === value ? <Check size={14} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "No se pudo completar la operacion.");
  }

  return payload as T;
}

export function SettingsModal({ onClose, onPromptsChanged }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"models" | "prompts" | "general" | "storage">("models");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [restarted, setRestarted] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isChunkingInfoOpen, setIsChunkingInfoOpen] = useState(false);

  const { handleBackdropClick } = useModalClose(onClose);
  const { handleBackdropClick: handleChunkingInfoBackdropClick } = useModalClose(() => setIsChunkingInfoOpen(false), isChunkingInfoOpen);

  function applyProvidersResponse(data: ProvidersResponse) {
    setProviders(data.providers);
    setSettings({
      activeProvider: data.activeProvider,
      selectedModels: data.selectedModels,
      adaptiveChunkingEnabled: data.adaptiveChunkingEnabled ?? true,
      minimumModelContextTokens: data.minimumModelContextTokens ?? 4000,
      outputRootDir: data.outputRootDir ?? ""
    });
  }

  useEffect(() => {
    apiFetch<ProvidersResponse>("/api/providers")
      .then(applyProvidersResponse)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la configuracion."));
  }, []);

  useEffect(() => {
    if (!settings?.activeProvider) return;
    apiFetch<{ models: ModelOption[] }>(`/api/models?provider=${settings.activeProvider}`)
      .then((data) => {
        setModels(data.models);
        if (!settings.selectedModels[settings.activeProvider] && data.models[0]) {
          setSettings((current) =>
            current
              ? {
                  ...current,
                  selectedModels: {
                    ...current.selectedModels,
                    [current.activeProvider]: data.models[0].id
                  }
                }
              : current
          );
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los modelos."));
  }, [settings?.activeProvider]);

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === settings?.activeProvider),
    [providers, settings?.activeProvider]
  );

  const filteredModels = useMemo(() => {
    const minimumContext = settings?.minimumModelContextTokens ?? 4000;
    return models.filter((model) => !model.limits?.maxInputTokens || model.limits.maxInputTokens >= minimumContext);
  }, [models, settings?.minimumModelContextTokens]);

  const contextOptions = useMemo(
    () =>
      CONTEXT_PRESETS.map((tokens) => {
        const unknownCount = models.filter((model) => !model.limits?.maxInputTokens).length;
        const count = models.filter((model) => model.limits?.maxInputTokens && model.limits.maxInputTokens >= tokens).length;

        return {
          value: tokens,
          label: formatPreset(tokens),
          count,
          unknownCount
        };
      }),
    [models]
  );

  useEffect(() => {
    if (!settings || filteredModels.length === 0) return;
    const selectedModel = settings.selectedModels[settings.activeProvider];
    if (!selectedModel || filteredModels.some((model) => model.id === selectedModel)) return;

    setSettings((current) =>
      current
        ? {
            ...current,
            selectedModels: {
              ...current.selectedModels,
              [current.activeProvider]: filteredModels[0].id
            }
          }
        : current
    );
  }, [filteredModels, settings]);

  async function handleSave() {
    if (!settings) return;
    setError("");
    setSaved(false);
    setRestarted(false);

    try {
      const data = await apiFetch<Settings>("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      setSettings(data);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuracion.");
    }
  }

  async function handleRestart() {
    setError("");
    setSaved(false);
    setRestarted(false);
    setIsRestarting(true);

    try {
      const data = await apiFetch<ProvidersResponse>("/api/restart", { method: "POST" });
      applyProvidersResponse(data);
      setRestarted(true);
      window.setTimeout(() => setRestarted(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reiniciar la configuracion.");
    } finally {
      setIsRestarting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Configuracion" onClick={handleBackdropClick}>
      <section className="settings-modal">
        <header className="modal-header" style={{ paddingBottom: 0 }}>
          <div style={{ flex: 1 }}>
            <h2>Configuración</h2>
            <div style={{ display: "flex", gap: "20px", marginTop: "16px", borderBottom: "1px solid #e2e8f0" }}>
              <button 
                type="button" 
                onClick={() => setActiveTab("models")}
                style={{ 
                  display: "flex", alignItems: "center", gap: "8px", padding: "8px 4px", 
                  background: "transparent", border: "none", borderBottom: activeTab === "models" ? "2px solid #1d4ed8" : "2px solid transparent",
                  color: activeTab === "models" ? "#1d4ed8" : "#64748b", fontWeight: activeTab === "models" ? "600" : "500",
                  cursor: "pointer", fontSize: "14px"
                }}
              >
                <Settings2 size={16} /> Modelos AI
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab("prompts")}
                style={{ 
                  display: "flex", alignItems: "center", gap: "8px", padding: "8px 4px", 
                  background: "transparent", border: "none", borderBottom: activeTab === "prompts" ? "2px solid #1d4ed8" : "2px solid transparent",
                  color: activeTab === "prompts" ? "#1d4ed8" : "#64748b", fontWeight: activeTab === "prompts" ? "600" : "500",
                  cursor: "pointer", fontSize: "14px"
                }}
              >
                <FileText size={16} /> Prompts
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab("general")}
                style={{ 
                  display: "flex", alignItems: "center", gap: "8px", padding: "8px 4px", 
                  background: "transparent", border: "none", borderBottom: activeTab === "general" ? "2px solid #1d4ed8" : "2px solid transparent",
                  color: activeTab === "general" ? "#1d4ed8" : "#64748b", fontWeight: activeTab === "general" ? "600" : "500",
                  cursor: "pointer", fontSize: "14px"
                }}
              >
                <Sliders size={16} /> General
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab("storage")}
                style={{ 
                  display: "flex", alignItems: "center", gap: "8px", padding: "8px 4px", 
                  background: "transparent", border: "none", borderBottom: activeTab === "storage" ? "2px solid #1d4ed8" : "2px solid transparent",
                  color: activeTab === "storage" ? "#1d4ed8" : "#64748b", fontWeight: activeTab === "storage" ? "600" : "500",
                  cursor: "pointer", fontSize: "14px"
                }}
              >
                <FolderOpen size={16} /> Almacenamiento
              </button>
            </div>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar configuración" onClick={onClose} style={{ alignSelf: "flex-start" }}>
            <X size={20} />
          </button>
        </header>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {activeTab === "prompts" ? (
            <PromptsSettings onPromptsChanged={() => onPromptsChanged?.()} />
          ) : (
            <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
              {settings ? (
                <div className="settings-grid">
                  {activeTab === "general" ? (
                    <>
                      <div className="restart-card" style={{ marginTop: "24px" }}>
                        <div>
                          <strong>Reiniciar configuracion</strong>
                          <span>Recarga el archivo .env y actualiza las claves detectadas.</span>
                        </div>
                        <button className="secondary-button" type="button" onClick={handleRestart} disabled={isRestarting}>
                          <RefreshCw className={isRestarting ? "spin" : undefined} size={17} />
                          {isRestarting ? "Reiniciando" : "Reiniciar"}
                        </button>
                      </div>
                    </>
                  ) : activeTab === "storage" ? (
                    <>
                      <label className="field" style={{ gridColumn: "1 / -1" }}>
                        <span>Ruta raíz de almacenamiento</span>
                        <input
                          type="text"
                          placeholder="Ej: C:\Ruta\Al\Contenido (Vacío para usar la carpeta del proyecto)"
                          value={settings.outputRootDir || ""}
                          onChange={(event) =>
                            setSettings((current) =>
                              current ? { ...current, outputRootDir: event.target.value } : current
                            )
                          }
                        />
                      </label>
                      
                      <div style={{ gridColumn: "1 / -1", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginTop: "8px" }}>
                        <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px 0", color: "#334155" }}>
                          Estructura de directorios generada:
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "#64748b" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px" }}>
                            <span>Transcripciones originales:</span>
                            <code style={{ background: "#edf2f7", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", wordBreak: "break-all" }}>
                              {settings.outputRootDir ? `${settings.outputRootDir}\\transcripts` : "output/transcripts"}
                            </code>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px" }}>
                            <span>Resultados finales (.md):</span>
                            <code style={{ background: "#edf2f7", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", wordBreak: "break-all" }}>
                              {settings.outputRootDir ? `${settings.outputRootDir}\\results` : "output/results"}
                            </code>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px" }}>
                            <span>Diagramas (Mermaid):</span>
                            <code style={{ background: "#edf2f7", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", wordBreak: "break-all" }}>
                              {settings.outputRootDir ? `${settings.outputRootDir}\\diagrams` : "output/diagrams"}
                            </code>
                          </div>
                        </div>
                      </div>

                      <div style={{ gridColumn: "1 / -1", fontSize: "13px", color: "#64748b", lineHeight: "1.5", marginTop: "8px" }}>
                        <strong>Nota:</strong> Si cambias la ruta raíz, CaptionFlow creará automáticamente las subcarpetas necesarias en el nuevo destino al procesar un video. Los resultados anteriores permanecerán en su ubicación original.
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="field">
                        <span>Proveedor de IA</span>
                        <select
                          value={settings.activeProvider}
                          onChange={(event) => {
                            const activeProvider = event.target.value as ProviderId;
                            setSettings((current) => (current ? { ...current, activeProvider } : current));
                          }}
                        >
                          {providers.map((provider) => (
                            <option key={provider.id} value={provider.id}>
                              {provider.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="model-selection-grid">
                        <label className="field">
                          <span>Modelo</span>
                          <ModelCombobox
                            models={filteredModels}
                            value={settings.selectedModels[settings.activeProvider] || ""}
                            provider={settings.activeProvider}
                            onChange={(event) =>
                              setSettings((current) =>
                                current
                                  ? {
                                      ...current,
                                      selectedModels: {
                                        ...current.selectedModels,
                                        [current.activeProvider]: event
                                      }
                                    }
                                  : current
                              )
                            }
                          />
                        </label>

                        <label className="minimum-context-filter-field">
                          <span className="minimum-context-filter-label">Filtrar modelos con contexto mínimo superior a</span>
                          <ContextPresetCombobox
                            value={settings.minimumModelContextTokens ?? 4000}
                            options={contextOptions}
                            onChange={(value) =>
                              setSettings((current) =>
                                current ? { ...current, minimumModelContextTokens: value } : current
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className={activeProvider?.configured ? "key-status ready" : "key-status missing"}>
                        <KeyRound size={18} />
                        <span>{activeProvider?.configured ? "API key detectada en backend" : "API key no configurada en .env"}</span>
                      </div>

                      <div className="model-context-toggle-row">
                        <label className="model-context-toggle">
                          <input
                            type="checkbox"
                            checked={Boolean(settings.adaptiveChunkingEnabled)}
                            onChange={(event) =>
                              setSettings((current) => (current ? { ...current, adaptiveChunkingEnabled: event.target.checked } : current))
                            }
                          />
                          <span>Activar chunking adaptativo</span>
                        </label>
                        <button className="model-context-info" type="button" aria-label="Información sobre chunking adaptativo" onClick={() => setIsChunkingInfoOpen(true)}>
                          <Info size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {error ? (
                <div className="error-message compact" role="alert" style={{ marginTop: "16px" }}>
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              ) : null}

              <footer className="modal-footer" style={{ marginTop: "24px" }}>
                {saved ? (
                  <span className="saved-indicator">
                    <Check size={17} />
                    Guardado
                  </span>
                ) : null}
                {restarted ? (
                  <span className="saved-indicator">
                    <Check size={17} />
                    Reiniciado
                  </span>
                ) : null}
                <button className="secondary-button" type="button" onClick={onClose}>
                  Cerrar
                </button>
                <button className="primary-button subtle-primary-button compact-button" type="button" onClick={handleSave} disabled={!settings}>
                  Guardar
                </button>
              </footer>
            </div>
          )}
        </div>
      </section>
      {isChunkingInfoOpen ? (
        <div className="modal-backdrop nested-backdrop" role="dialog" aria-modal="true" aria-label="Información sobre chunking adaptativo" onClick={handleChunkingInfoBackdropClick}>
          <section className="confirm-modal chunking-info-modal">
            <h2>Modelo y transcripciones largas</h2>
            <p>
              El chunking divide una transcripción larga en partes para que el modelo pueda procesarla sin superar su ventana de contexto.
              CaptionFlow resume cada parte y después genera el documento final con ese material intermedio.
            </p>
            <div className="chunking-info-grid">
              <div>
                <strong>Activar chunking adaptativo</strong>
                <span>Si está activo, el tamaño de cada parte se calcula automáticamente según el contexto real del modelo seleccionado.</span>
              </div>
            </div>
            <p>
              El chunking adaptativo reserva margen para instrucciones y respuesta, y usa el resto del contexto seguro del modelo para decidir cada corte.
            </p>
            <div className="confirm-actions">
              <button className="primary-button subtle-primary-button compact-button" type="button" onClick={() => setIsChunkingInfoOpen(false)}>
                Entendido
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
