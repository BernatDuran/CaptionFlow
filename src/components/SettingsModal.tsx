import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  BarChart3,
  Check,
  ChevronDown,
  FileText,
  FolderOpen,
  Info,
  KeyRound,
  RefreshCw,
  Settings2,
  Sliders,
  X
} from "lucide-react";
import { apiFetch } from "../api/client";
import type { Provider, ProviderId, ProvidersResponse, Settings } from "../api/types";
import { ModelCombobox, type ModelOption } from "./ModelCombobox";
import { ConfirmModal, ModalShell } from "./ModalShell";
import { PromptsSettings } from "./PromptsSettings";
import { Button, IconButton, Tabs } from "./ui";

type SettingsModalProps = {
  onClose: () => void;
  onPromptsChanged?: () => void;
  onSettingsChanged?: (settings: Settings) => void;
};

type SettingsTab = "models" | "prompts" | "general" | "storage";

const CONTEXT_PRESETS = [4000, 8000, 16000, 32000, 64000, 128000, 256000];

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: ReactNode }[] = [
  { id: "models", label: "Modelos AI", icon: <Settings2 size={16} /> },
  { id: "prompts", label: "Prompts", icon: <FileText size={16} /> },
  { id: "general", label: "General", icon: <Sliders size={16} /> },
  { id: "storage", label: "Almacenamiento", icon: <FolderOpen size={16} /> }
];

function formatPreset(tokens: number) {
  return `${Math.round(tokens / 1000)}k`;
}

function getModelContextTokens(model: ModelOption) {
  return model.limits?.maxInputTokens ?? model.contextTokens ?? null;
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

export function SettingsModal({ onClose, onPromptsChanged, onSettingsChanged }: SettingsModalProps) {
  const titleId = useId();
  const [activeTab, setActiveTab] = useState<SettingsTab>("models");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [restarted, setRestarted] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isChunkingInfoOpen, setIsChunkingInfoOpen] = useState(false);
  const [isAnalyticsConfirmOpen, setIsAnalyticsConfirmOpen] = useState(false);

  function applyProvidersResponse(data: ProvidersResponse) {
    setProviders(data.providers);
    setSettings({
      activeProvider: data.activeProvider,
      selectedModels: data.selectedModels,
      adaptiveChunkingEnabled: data.adaptiveChunkingEnabled ?? true,
      minimumModelContextTokens: data.minimumModelContextTokens ?? 4000,
      outputRootDir: data.outputRootDir ?? "",
      analyticsEnabled: data.analyticsEnabled ?? false
    });
  }

  useEffect(() => {
    let isMounted = true;
    setIsLoadingSettings(true);
    apiFetch<ProvidersResponse>("/api/providers")
      .then((data) => {
        if (!isMounted) return;
        applyProvidersResponse(data);
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : "No se pudo cargar la configuracion.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingSettings(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!settings?.activeProvider) return;

    let isMounted = true;
    setIsLoadingModels(true);
    apiFetch<{ models: ModelOption[] }>(`/api/models?provider=${settings.activeProvider}`)
      .then((data) => {
        if (!isMounted) return;
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
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : "No se pudieron cargar los modelos.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingModels(false);
      });

    return () => {
      isMounted = false;
    };
  }, [settings?.activeProvider]);

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === settings?.activeProvider),
    [providers, settings?.activeProvider]
  );

  const filteredModels = useMemo(() => {
    const minimumContext = settings?.minimumModelContextTokens ?? 4000;
    return models.filter((model) => {
      const contextTokens = getModelContextTokens(model);
      return !contextTokens || contextTokens >= minimumContext;
    });
  }, [models, settings?.minimumModelContextTokens]);

  const contextOptions = useMemo(
    () =>
      CONTEXT_PRESETS.map((tokens) => {
        const unknownCount = models.filter((model) => !getModelContextTokens(model)).length;
        const count = models.filter((model) => {
          const contextTokens = getModelContextTokens(model);
          return Boolean(contextTokens && contextTokens >= tokens);
        }).length;

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
    if (!settings || isLoadingModels || filteredModels.length === 0) return;
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
  }, [filteredModels, isLoadingModels, settings]);

  async function saveSettings(nextSettings: Settings) {
    setError("");
    setSaved(false);
    setRestarted(false);

    try {
      const data = await apiFetch<Settings>("/api/settings", {
        method: "POST",
        json: nextSettings
      });
      setSettings(data);
      onSettingsChanged?.(data);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuracion.");
    }
  }

  async function handleSave() {
    if (!settings) return;
    await saveSettings(settings);
  }

  function handleAnalyticsToggle(checked: boolean) {
    if (!settings) return;
    if (checked && !settings.analyticsEnabled) {
      setIsAnalyticsConfirmOpen(true);
      return;
    }

    setSettings((current) => (current ? { ...current, analyticsEnabled: checked } : current));
  }

  async function confirmAnalyticsEnabled() {
    if (!settings) return;
    const nextSettings = { ...settings, analyticsEnabled: true };
    setIsAnalyticsConfirmOpen(false);
    setSettings(nextSettings);
    await saveSettings(nextSettings);
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
    <ModalShell className="settings-modal" labelledBy={titleId} onClose={onClose}>
      <header className="modal-header settings-modal-header">
        <div className="settings-modal-heading">
          <h2 id={titleId}>Configuración</h2>
          <Tabs items={SETTINGS_TABS} value={activeTab} onChange={setActiveTab} />
        </div>
        <IconButton type="button" aria-label="Cerrar configuración" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </header>

      <div className="settings-modal-body">
        {activeTab === "prompts" ? (
          <PromptsSettings onPromptsChanged={() => onPromptsChanged?.()} />
        ) : (
          <div className="settings-scroll">
            {isLoadingSettings ? (
              <div className="settings-loading">Cargando configuración...</div>
            ) : settings ? (
              <div className="settings-grid">
                {activeTab === "general" ? (
                  <>
                    <div className="settings-option-card">
                      <div>
                        <strong>Analítica de datos</strong>
                        <span>Activa el dashboard local con filtros, métricas y gráficos personalizados.</span>
                      </div>
                      <label className="settings-switch">
                        <input
                          type="checkbox"
                          checked={Boolean(settings.analyticsEnabled)}
                          onChange={(event) => handleAnalyticsToggle(event.target.checked)}
                        />
                        <span>Habilitar analítica de datos</span>
                      </label>
                    </div>

                    <div className="restart-card">
                      <div>
                        <strong>Reiniciar configuración</strong>
                        <span>Recarga el archivo .env y actualiza las claves detectadas.</span>
                      </div>
                      <Button type="button" onClick={handleRestart} disabled={isRestarting}>
                        <RefreshCw className={isRestarting ? "spin" : undefined} size={17} />
                        {isRestarting ? "Reiniciando" : "Reiniciar"}
                      </Button>
                    </div>
                  </>
                ) : activeTab === "storage" ? (
                  <>
                    <label className="field settings-grid-span">
                      <span>Ruta raíz de almacenamiento</span>
                      <input
                        type="text"
                        placeholder="Ej: C:\Ruta\Al\Contenido (Vacío para usar la carpeta del proyecto)"
                        value={settings.outputRootDir || ""}
                        onChange={(event) =>
                          setSettings((current) => (current ? { ...current, outputRootDir: event.target.value } : current))
                        }
                      />
                    </label>

                    <div className="settings-storage-note">
                      <strong>Nota:</strong> Si cambias la ruta raíz, CaptionFlow creará automáticamente las subcarpetas necesarias en
                      el nuevo destino al procesar un video. Los resultados anteriores permanecerán en su ubicación original.
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
                        {isLoadingModels ? (
                          <div className="settings-model-loading">Cargando modelos...</div>
                        ) : (
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
                        )}
                      </label>

                      <label className="minimum-context-filter-field">
                        <span className="minimum-context-filter-label">Filtrar modelos con contexto mínimo superior a</span>
                        <ContextPresetCombobox
                          value={settings.minimumModelContextTokens ?? 4000}
                          options={contextOptions}
                          onChange={(value) =>
                            setSettings((current) => (current ? { ...current, minimumModelContextTokens: value } : current))
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
                            setSettings((current) =>
                              current ? { ...current, adaptiveChunkingEnabled: event.target.checked } : current
                            )
                          }
                        />
                        <span>Activar chunking adaptativo</span>
                      </label>
                      <button
                        className="model-context-info"
                        type="button"
                        aria-label="Información sobre chunking adaptativo"
                        onClick={() => setIsChunkingInfoOpen(true)}
                      >
                        <Info size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {error ? (
              <div className="error-message compact settings-error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            ) : null}

            <footer className="modal-footer settings-modal-footer">
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
              <Button type="button" onClick={onClose}>
                Cerrar
              </Button>
              <Button variant="subtle" compact type="button" onClick={handleSave} disabled={!settings}>
                Guardar
              </Button>
            </footer>
          </div>
        )}
      </div>

      {isChunkingInfoOpen ? (
        <ConfirmModal
          nested
          className="chunking-info-modal"
          title="Modelo y transcripciones largas"
          onClose={() => setIsChunkingInfoOpen(false)}
          actions={
            <Button variant="subtle" compact type="button" onClick={() => setIsChunkingInfoOpen(false)}>
              Entendido
            </Button>
          }
        >
          <p>
            El chunking divide una transcripción larga en partes para que el modelo pueda procesarla sin superar su ventana de
            contexto. CaptionFlow resume cada parte y después genera el documento final con ese material intermedio.
          </p>
          <div className="chunking-info-grid">
            <div>
              <strong>Activar chunking adaptativo</strong>
              <span>Si está activo, el tamaño de cada parte se calcula automáticamente según el contexto real del modelo seleccionado.</span>
            </div>
          </div>
          <p>
            El chunking adaptativo reserva margen para instrucciones y respuesta, y usa el resto del contexto seguro del modelo para
            decidir cada corte.
          </p>
        </ConfirmModal>
      ) : null}

      {isAnalyticsConfirmOpen ? (
        <ConfirmModal
          nested
          className="analytics-confirm-modal"
          title={
            <>
              <span className="process-confirm-icon" aria-hidden="true">
                <BarChart3 size={18} />
              </span>
              Habilitar analítica
            </>
          }
          onClose={() => setIsAnalyticsConfirmOpen(false)}
          actions={
            <>
              <Button type="button" onClick={() => setIsAnalyticsConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button variant="subtle" compact type="button" onClick={() => void confirmAnalyticsEnabled()}>
                Habilitar
              </Button>
            </>
          }
        >
          <p>
            CaptionFlow usará los metadatos locales de resultados, documentos y diagramas para construir dashboards. No se enviarán
            datos a servicios externos.
          </p>
        </ConfirmModal>
      ) : null}
    </ModalShell>
  );
}
