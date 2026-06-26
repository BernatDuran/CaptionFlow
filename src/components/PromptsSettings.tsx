import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "../api/client";
import type { PromptSummary } from "../api/types";
import { ConfirmModal } from "./ModalShell";
import { Button, EmptyState } from "./ui";

type PromptDefinition = PromptSummary & {
  content: string;
};

type PromptsSettingsProps = {
  onPromptsChanged: () => void;
};

export function PromptsSettings({ onPromptsChanged }: PromptsSettingsProps) {
  const [prompts, setPrompts] = useState<PromptDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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
      const finalId = isNew ? formName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "nuevo-prompt" : formId;

      const data = await apiFetch<{ prompt: PromptDefinition }>("/api/prompts", {
        method: "POST",
        json: {
          id: finalId,
          name: formName,
          description: formDescription,
          outputFilenamePrefix: formPrefix,
          temperature: formTemperature,
          content: formContent
        }
      });

      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);

      if (isNew) {
        setSelectedId(data.prompt.id);
        setFormId(data.prompt.id);
      }
      onPromptsChanged();
      await loadPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando el prompt");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSelectedPrompt() {
    if (selectedId === "new") return;

    setError("");
    setIsDeleting(true);
    try {
      await apiFetch(`/api/prompts/${encodeURIComponent(selectedId)}`, { method: "DELETE" });
      setSelectedId("");
      setFormId("");
      setIsDeleteConfirmOpen(false);
      onPromptsChanged();
      await loadPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando el prompt");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="prompts-settings-loading">
        <Loader2 className="spin" />
      </div>
    );
  }

  const isNew = selectedId === "new";

  return (
    <div className="prompts-settings-container">
      <aside className="prompts-settings-sidebar">
        <Button type="button" onClick={handleNewPrompt} className="prompts-new-button">
          <Plus size={16} /> Nuevo prompt
        </Button>
        <div className="prompts-settings-list">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              className="prompt-list-item"
              aria-selected={selectedId === prompt.id}
              onClick={() => selectPrompt(prompt)}
            >
              {prompt.name}
            </button>
          ))}
          {isNew ? (
            <button type="button" className="prompt-list-item is-new" aria-selected="true">
              Nuevo...
            </button>
          ) : null}
        </div>
      </aside>

      <div className="prompts-settings-editor">
        {selectedId || isNew ? (
          <>
            <div className="settings-grid prompts-editor-grid">
              <label className="field">
                <span>Nombre del prompt</span>
                <input type="text" value={formName} onChange={(event) => setFormName(event.target.value)} placeholder="Ej. Resumen Detallado" />
              </label>

              <label className="field">
                <span>Descripción</span>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  placeholder="Breve explicación de qué hace este prompt"
                />
              </label>

              <div className="prompts-two-column-row">
                <label className="field">
                  <span>Prefijo del archivo generado</span>
                  <input type="text" value={formPrefix} onChange={(event) => setFormPrefix(event.target.value)} placeholder="Ej. resumen" />
                </label>
                <label className="field">
                  <span>Temperatura (0.0 a 1.0)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={formTemperature}
                    onChange={(event) => setFormTemperature(parseFloat(event.target.value))}
                  />
                </label>
              </div>

              <label className="field prompts-content-field">
                <span>Contenido del Prompt (Instrucciones para la IA)</span>
                <textarea
                  value={formContent}
                  onChange={(event) => setFormContent(event.target.value)}
                  className="prompts-content-textarea"
                  placeholder="Escribe aquí las instrucciones de sistema..."
                />
              </label>
            </div>

            {error ? (
              <div className="error-message compact prompts-error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="prompts-editor-footer">
              {!isNew ? (
                <Button variant="danger" type="button" onClick={() => setIsDeleteConfirmOpen(true)} disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                  Eliminar
                </Button>
              ) : (
                <span />
              )}

              <div className="prompts-save-group">
                {saved ? (
                  <span className="saved-indicator prompts-saved-indicator">
                    <Check size={16} /> Guardado
                  </span>
                ) : null}
                <Button variant="subtle" compact type="button" onClick={handleSave} disabled={isSaving || !formName || !formContent}>
                  {isSaving ? <Loader2 className="spin" size={16} /> : "Guardar"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState className="prompts-empty">Selecciona o crea un prompt.</EmptyState>
        )}
      </div>

      {isDeleteConfirmOpen ? (
        <ConfirmModal
          nested
          title="Eliminar prompt"
          onClose={() => setIsDeleteConfirmOpen(false)}
          actions={
            <>
              <Button type="button" onClick={() => setIsDeleteConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button variant="danger" type="button" onClick={() => void deleteSelectedPrompt()} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                Eliminar
              </Button>
            </>
          }
        >
          <p>¿Estás seguro de que quieres eliminar este prompt?</p>
        </ConfirmModal>
      ) : null}
    </div>
  );
}
