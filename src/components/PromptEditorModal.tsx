import { useEffect, useState } from "react";
import { useModalClose } from "./useModalClose";

type PromptEditorModalProps = {
  initialPrompt: string;
  onSave: (newPrompt: string) => void;
  onClose: () => void;
};

export function PromptEditorModal({ initialPrompt, onSave, onClose }: PromptEditorModalProps) {
  const [promptText, setPromptText] = useState(initialPrompt);
  const { handleBackdropClick } = useModalClose(onClose);

  useEffect(() => {
    setPromptText(initialPrompt);
  }, [initialPrompt]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar Prompt" onClick={handleBackdropClick}>
      <section className="confirm-modal prompt-editor-modal" style={{ width: "min(800px, 90vw)", display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
        <h2>Editar Prompt Personalizado</h2>
        <p>Modifica las instrucciones para este procesamiento. Esto solo afectará a la ejecución actual.</p>
        
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          className="prompt-textarea"
          style={{
            flex: 1,
            minHeight: "300px",
            marginTop: "16px",
            padding: "12px",
            fontFamily: "monospace",
            fontSize: "14px",
            border: "1px solid #d8dee8",
            borderRadius: "6px",
            resize: "vertical"
          }}
        />

        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary-button subtle-primary-button"
            type="button"
            onClick={() => onSave(promptText)}
            disabled={!promptText.trim()}
          >
            Guardar y usar
          </button>
        </div>
      </section>
    </div>
  );
}
