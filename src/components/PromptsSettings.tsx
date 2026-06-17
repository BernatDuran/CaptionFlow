import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Plus, Trash2 } from "lucide-react";
import type { PromptSummary } from "./PromptSelector";

type PromptDefinition = PromptSummary & {
  content: string;
};

type PromptsSettingsProps = {
  onPromptsChanged: () => void;
};

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "No se pudo completar la operación.");
  }
  return payload as T;
}

export function PromptsSettings({ onPromptsChanged }: PromptsSettingsProps) {
  const [prompts, setPrompts] = useState<PromptDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Form state
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrefix, setFormPrefix] = useState("");
  const [formTemperature, setFormTemperature] = useState<number>(0.3);
  const [formContent, setFormContent] = useState("");

  async function loadPrompts() {
    setIsLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ prompts: PromptDefinition[] }>("/api/prompts");
      setPrompts(data.prompts);
      if (data.prompts.length > 0 && !selectedId && !formId) {
        selectPrompt(data.prompts[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando prompts");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPrompts();
  }, []);

  function selectPrompt(prompt: PromptDefinition) {
    setSelectedId(prompt.id);
    setFormId(prompt.id);
    setFormName(prompt.name || "");
    setFormDescription(prompt.description || "");
    setFormPrefix(prompt.outputFilenamePrefix || "");
    setFormTemperature(prompt.temperature ?? 0.3);
    setFormContent(prompt.content || "");
    setError("");
    setSaved(false);
  }

  function handleNewPrompt() {
    setSelectedId("new");
    setFormId("nuevo-prompt");
    setFormName("Nuevo Prompt");
    setFormDescription("");
    setFormPrefix("resultado");
    setFormTemperature(0.3);
    setFormContent("");
    setError("");
    setSaved(false);
  }

  async function handleSave() {
    setError("");
    setIsSaving(true);
    setSaved(false);
    try {
      const isNew = selectedId === "new";
      // Generate ID from name if it's new
      const finalId = isNew ? formName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "nuevo-prompt" : formId;
      
      const payload = {
        id: finalId,
        name: formName,
        description: formDescription,
        outputFilenamePrefix: formPrefix,
        temperature: formTemperature,
        content: formContent
      };

      const data = await apiFetch<{ prompt: PromptDefinition }>("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      
      // Update UI
      if (isNew) {
        setSelectedId(data.prompt.id);
        setFormId(data.prompt.id);
      }
      onPromptsChanged(); // Trigger reload in App.tsx
      await loadPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando el prompt");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (selectedId === "new") return;
    if (!window.confirm("¿Estás seguro de que quieres eliminar este prompt?")) return;

    setError("");
    setIsDeleting(true);
    try {
      await apiFetch(`/api/prompts/${encodeURIComponent(selectedId)}`, { method: "DELETE" });
      setSelectedId("");
      setFormId("");
      onPromptsChanged();
      await loadPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando el prompt");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}><Loader2 className="spin" /></div>;
  }

  const isNew = selectedId === "new";

  return (
    <div className="prompts-settings-container" style={{ display: "flex", gap: "24px", height: "100%", flex: 1, minHeight: 0 }}>
      {/* Sidebar List */}
      <div style={{ width: "260px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px", borderRight: "1px solid #e2e8f0", paddingRight: "20px" }}>
        <button 
          className="secondary-button" 
          type="button" 
          onClick={handleNewPrompt}
          style={{ width: "100%", justifyContent: "center" }}
        >
          <Plus size={16} /> Nuevo prompt
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", flex: 1 }}>
          {prompts.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPrompt(p)}
              style={{
                textAlign: "left",
                padding: "8px 12px",
                border: "none",
                borderRadius: "6px",
                background: selectedId === p.id ? "#eff6ff" : "transparent",
                color: selectedId === p.id ? "#1d4ed8" : "#475569",
                fontWeight: selectedId === p.id ? "600" : "500",
                cursor: "pointer",
                fontSize: "13px"
              }}
            >
              {p.name}
            </button>
          ))}
          {isNew && (
            <button
              type="button"
              style={{
                textAlign: "left",
                padding: "8px 12px",
                border: "none",
                borderRadius: "6px",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "13px",
                fontStyle: "italic"
              }}
            >
              Nuevo...
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minHeight: 0 }}>
        {selectedId || isNew ? (
          <>
            <div className="settings-grid" style={{ gridTemplateColumns: "1fr", flex: 1, overflowY: "auto", paddingRight: "10px", alignContent: "start" }}>
              <label className="field">
                <span>Nombre del prompt</span>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  placeholder="Ej. Resumen Detallado"
                />
              </label>

              <label className="field">
                <span>Descripción</span>
                <input 
                  type="text" 
                  value={formDescription} 
                  onChange={(e) => setFormDescription(e.target.value)} 
                  placeholder="Breve explicación de qué hace este prompt"
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <label className="field">
                  <span>Prefijo del archivo generado</span>
                  <input 
                    type="text" 
                    value={formPrefix} 
                    onChange={(e) => setFormPrefix(e.target.value)} 
                    placeholder="Ej. resumen"
                  />
                </label>
                <label className="field">
                  <span>Temperatura (0.0 a 1.0)</span>
                  <input 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="1"
                    value={formTemperature} 
                    onChange={(e) => setFormTemperature(parseFloat(e.target.value))} 
                  />
                </label>
              </div>

              <label className="field" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <span>Contenido del Prompt (Instrucciones para la IA)</span>
                <textarea 
                  value={formContent} 
                  onChange={(e) => setFormContent(e.target.value)} 
                  style={{ flex: 1, minHeight: "250px", fontFamily: "monospace", padding: "12px", fontSize: "13px", resize: "vertical" }}
                  placeholder="Escribe aquí las instrucciones de sistema..."
                />
              </label>
            </div>

            {error ? (
              <div className="error-message compact" role="alert" style={{ flexShrink: 0 }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid #e2e8f0", flexShrink: 0 }}>
              {!isNew ? (
                <button className="secondary-button" type="button" onClick={handleDelete} disabled={isDeleting} style={{ color: "#ef4444" }}>
                  {isDeleting ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                  Eliminar
                </button>
              ) : <div></div>}
              
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {saved && (
                  <span className="saved-indicator" style={{ display: "flex", alignItems: "center", gap: "4px", color: "#10b981", fontSize: "13px" }}>
                    <Check size={16} /> Guardado
                  </span>
                )}
                <button className="primary-button subtle-primary-button compact-button" type="button" onClick={handleSave} disabled={isSaving || !formName || !formContent}>
                  {isSaving ? <Loader2 className="spin" size={16} /> : "Guardar"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
            Selecciona o crea un prompt.
          </div>
        )}
      </div>
    </div>
  );
}
