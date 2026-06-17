import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import { useModalClose } from "./useModalClose";

export type DownloadType = "txt" | "markdown" | "pdf";

interface DownloadModalProps {
  isOpen: boolean;
  type: DownloadType;
  url: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DownloadModal({ isOpen, type, url, onConfirm, onCancel }: DownloadModalProps) {
  const { handleBackdropClick } = useModalClose(onCancel, isOpen);

  if (!isOpen) return null;

  const getTitle = () => {
    switch (type) {
      case "pdf": return "Descargar PDF";
      case "markdown": return "Descargar archivo Markdown";
      case "txt": return "Descargar archivo de texto";
      default: return "Descargar archivo";
    }
  };

  const isPdf = type === "pdf" && url;

  return createPortal(
    <div className="modal-backdrop nested-backdrop" role="dialog" aria-modal="true" aria-label={getTitle()} onClick={handleBackdropClick}>
      <section className={`confirm-modal ${isPdf ? "download-modal-pdf" : "download-modal-standard"}`}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0 }}>{getTitle()}</h2>
          <button className="icon-button" type="button" aria-label="Cerrar modal" onClick={onCancel} style={{ padding: "4px" }}>
            <X size={20} />
          </button>
        </header>

        <p style={{ marginBottom: "20px", color: "#64748b" }}>
          ¿Estás seguro de que deseas descargar este documento?
        </p>

        {isPdf && (
          <div className="pdf-preview-container">
            <iframe 
              src={url + (url?.includes('?') ? '&' : '?') + 'preview=true#toolbar=0&navpanes=0&scrollbar=0'} 
              className="pdf-preview-frame" 
              title="Previsualización PDF" 
              style={{ width: "100%", height: "500px", border: "1px solid #cbd5e1", borderRadius: "8px", backgroundColor: "#f8fafc" }}
            />
          </div>
        )}

        <footer className="modal-footer" style={{ marginTop: "24px" }}>
          <button className="secondary-button small-action-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button 
            className="primary-button subtle-primary-button compact-button small-action-button" 
            type="button" 
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Download size={16} /> Descargar
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
