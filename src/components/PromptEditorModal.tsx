import { useEffect, useId, useState } from "react";
import { ModalShell } from "./ModalShell";
import { Button } from "./ui";

type PromptEditorModalProps = {
  initialPrompt: string;
  onSave: (newPrompt: string) => void;
  onClose: () => void;
};

export function PromptEditorModal({ initialPrompt, onSave, onClose }: PromptEditorModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [promptText, setPromptText] = useState(initialPrompt);

  useEffect(() => {
    setPromptText(initialPrompt);
  }, [initialPrompt]);

  return (
    <ModalShell className="confirm-modal prompt-editor-modal" labelledBy={titleId} describedBy={descriptionId} onClose={onClose}>
      <h2 id={titleId}>Editar Prompt Personalizado</h2>
      <p id={descriptionId}>Modifica las instrucciones para este procesamiento. Esto solo afectará a la ejecución actual.</p>

      <textarea value={promptText} onChange={(event) => setPromptText(event.target.value)} className="prompt-textarea" />

      <div className="confirm-actions">
        <Button type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="subtle" type="button" onClick={() => onSave(promptText)} disabled={!promptText.trim()}>
          Guardar y usar
        </Button>
      </div>
    </ModalShell>
  );
}
