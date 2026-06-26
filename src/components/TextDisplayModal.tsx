import { useId, useState, type ReactNode } from "react";
import { Check, Copy, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DownloadModal, type DownloadType } from "./DownloadModal";
import { ModalHeader, ModalShell } from "./ModalShell";
import { Button } from "./ui";

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

export function TextDisplayModal({
  title,
  subtitle,
  chips,
  content,
  onClose,
  downloadUrl,
  downloadAction,
  onDownloadTxt,
  enableCopy,
  isMarkdown
}: TextDisplayModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [copied, setCopied] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <ModalShell className="confirm-modal text-display-modal" labelledBy={titleId} describedBy={descriptionId} onClose={onClose}>
      <ModalHeader
        title={title}
        subtitle={subtitle ? <span id={descriptionId}>{subtitle}</span> : undefined}
        titleId={titleId}
        onClose={onClose}
        className="text-display-header"
      >
        <div className="text-display-actions">
          {enableCopy ? (
            <Button className="small-action-button" type="button" onClick={handleCopy}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          ) : null}
          {onDownloadTxt ? (
            <Button className="small-action-button" type="button" onClick={() => setIsDownloadModalOpen(true)}>
              <Download size={15} />
              Descargar .txt
            </Button>
          ) : null}
        </div>
      </ModalHeader>

      {chips && chips.length > 0 ? (
        <div className="text-display-chips">
          {chips.map((chip, index) => (
            <span key={index} className="group-chip">
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <div className={`text-display-content${isMarkdown ? " is-markdown" : ""}`}>
        {isMarkdown ? (
          <article className="markdown-preview text-display-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        ) : (
          content
        )}
      </div>

      <div className="confirm-actions text-display-footer">
        <Button variant="subtle" type="button" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      <DownloadModal
        isOpen={isDownloadModalOpen}
        type={downloadAction || "txt"}
        url={downloadUrl || null}
        onConfirm={onDownloadTxt || (() => undefined)}
        onCancel={() => setIsDownloadModalOpen(false)}
      />
    </ModalShell>
  );
}
