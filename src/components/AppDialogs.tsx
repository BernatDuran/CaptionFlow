import { AlertTriangle } from "lucide-react";
import type { ProcessConfirmation } from "../hooks/useProcessJob";
import { ConfirmModal } from "./ModalShell";
import { Button } from "./ui";

type DiagramChoice = {
  filename: string;
  promptId: string;
} | null;

type ProcessConfirmationDialogProps = {
  confirmation: ProcessConfirmation | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ProcessConfirmationDialog({ confirmation, onCancel, onConfirm }: ProcessConfirmationDialogProps) {
  if (!confirmation) return null;

  return (
    <ConfirmModal
      title={
        <>
          <span className="process-confirm-icon" aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          {confirmation.title}
        </>
      }
      actions={
        <>
          <Button type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="subtle" type="button" onClick={onConfirm}>
            {confirmation.primaryLabel}
          </Button>
        </>
      }
      className="process-confirm-modal"
      onClose={onCancel}
    >
      <div className="process-confirm-copy">
        <p>{confirmation.message}</p>
        {confirmation.chips?.length ? (
          <div className="process-confirm-chips">
            {confirmation.chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        ) : null}
        {confirmation.kind === "chunking" ? (
          <div className="process-confirm-note">
            Se generaran resumenes por partes y despues un documento final con ese material intermedio.
          </div>
        ) : null}
      </div>
    </ConfirmModal>
  );
}

type ExistingDiagramConfirmDialogProps = {
  choice: DiagramChoice;
  onCancel: () => void;
  onGenerateNew: (choice: NonNullable<DiagramChoice>) => void;
  onOpenExisting: (choice: NonNullable<DiagramChoice>) => void;
};

export function ExistingDiagramConfirmDialog({ choice, onCancel, onGenerateNew, onOpenExisting }: ExistingDiagramConfirmDialogProps) {
  if (!choice) return null;

  return (
    <ConfirmModal
      title="Diagrama ya generado"
      actions={
        <>
          <Button type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onOpenExisting(choice)}>
            Abrir existente
          </Button>
          <Button variant="subtle" type="button" onClick={() => onGenerateNew(choice)}>
            Generar nuevo
          </Button>
        </>
      }
      onClose={onCancel}
    >
      <p>Este documento ya tiene un diagrama guardado. Puedes abrir el existente o generar uno nuevo.</p>
    </ConfirmModal>
  );
}
