import { useState, type ReactNode } from "react";
import { Copy, Check, Download, FileText, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DownloadModal, type DownloadType } from "./DownloadModal";
import { useModalClose } from "./useModalClose";

interface TextDisplayModalProps {
  title: string;
  subtitle?: string;
  chips?: ReactNode[];
  content: string;
  onClose: () => void;
  downloadUrl?: string;
  downloadAction?: DownloadType;
  onDownloadTxt?: () => void;
  enableCopy?: boolean;
  isMarkdown?: boolean;
}

export function TextDisplayModal({ title, subtitle, chips, content, onClose, downloadUrl, downloadAction, onDownloadTxt, enableCopy, isMarkdown }: TextDisplayModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const { handleBackdropClick } = useModalClose(onClose);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={handleBackdropClick}>
      <section className="confirm-modal" style={{ width: "min(800px, 90vw)", display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "20px", marginBottom: "4px" }}>{title}</h2>
            {subtitle ? <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>{subtitle}</p> : null}
            {chips && chips.length > 0 ? (
              <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                {chips.map((chip, i) => (
                  <span key={i} className="group-chip" style={{ fontSize: "12px", padding: "2px 8px", backgroundColor: "#e2e8f0", borderRadius: "12px", color: "#475569" }}>
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {enableCopy ? (
              <button
                className="secondary-button"
                type="button"
                onClick={handleCopy}
                style={{ height: "34px", padding: "0 12px", gap: "6px", fontSize: "13px" }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            ) : null}
            {onDownloadTxt ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                style={{ height: "34px", padding: "0 12px", gap: "6px", fontSize: "13px" }}
              >
                <Download size={15} />
                Descargar .txt
              </button>
            ) : null}
          </div>
        </div>
        
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            backgroundColor: "#f8fafc",
            border: "1px solid #d8dee8",
            borderRadius: "6px",
            padding: "16px",
            ...(isMarkdown ? {} : {
              fontFamily: "monospace",
              fontSize: "13px",
              lineHeight: "1.6",
              whiteSpace: "pre-wrap",
            }),
            color: "#334155"
          }}
        >
          {isMarkdown ? (
            <article className="markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </article>
          ) : (
            content
          )}
        </div>

        <div className="confirm-actions" style={{ marginTop: "20px" }}>
          <button className="primary-button subtle-primary-button" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </section>

      <DownloadModal
        isOpen={isDownloadModalOpen}
        type="txt"
        url={null}
        onConfirm={onDownloadTxt || (() => {})}
        onCancel={() => setIsDownloadModalOpen(false)}
      />
    </div>
  );
}
