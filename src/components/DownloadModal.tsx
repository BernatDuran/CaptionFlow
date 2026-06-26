import { useId } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { ModalHeader, ModalShell } from "./ModalShell";
import { Button } from "./ui";

export type DownloadType = "txt" | "markdown" | "pdf";

interface DownloadModalProps {
  isOpen: boolean;
  type: DownloadType;
  url: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function getTitle(type: DownloadType) {
  switch (type) {
    case "pdf":
      return "Descargar PDF";
    case "markdown":
      return "Descargar archivo Markdown";
    case "txt":
      return "Descargar archivo de texto";
    default:
      return "Descargar archivo";
  }
}

export function DownloadModal({ isOpen, type, url, onConfirm, onCancel }: DownloadModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  if (!isOpen) return null;

  const title = getTitle(type);
  const isPdf = type === "pdf" && url;

  return createPortal(
    <ModalShell
      nested
      className={`confirm-modal ${isPdf ? "download-modal-pdf" : "download-modal-standard"}`}
      labelledBy={titleId}
      describedBy={descriptionId}
      onClose={onCancel}
    >
      <ModalHeader title={title} titleId={titleId} onClose={onCancel} className="download-modal-header" />

      <p id={descriptionId} className="download-modal-copy">
        ¿Estás seguro de que deseas descargar este documento?
      </p>

      {isPdf ? (
        <div className="pdf-preview-container">
          <iframe
            src={url + (url?.includes("?") ? "&" : "?") + "preview=true#toolbar=0&navpanes=0&scrollbar=0"}
            className="pdf-preview-frame"
            title="Previsualización PDF"
          />
        </div>
      ) : null}

      <footer className="modal-footer download-modal-footer">
        <Button className="small-action-button" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="subtle"
          compact
          className="small-action-button"
          type="button"
          onClick={() => {
            onConfirm();
            onCancel();
          }}
        >
          <Download size={16} /> Descargar
        </Button>
      </footer>
    </ModalShell>,
    document.body
  );
}
