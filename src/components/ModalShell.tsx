import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./ui";
import { useModalBehavior } from "./useModalBehavior";

type ModalShellProps = {
  children: ReactNode;
  className: string;
  labelledBy?: string;
  describedBy?: string;
  nested?: boolean;
  onClose: () => void;
};

export function ModalShell({ children, className, labelledBy, describedBy, nested, onClose }: ModalShellProps) {
  const { dialogRef, handleBackdropClick } = useModalBehavior(onClose);

  return (
    <div className={`modal-backdrop${nested ? " nested-backdrop" : ""}`} onClick={handleBackdropClick}>
      <section
        ref={dialogRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>
  );
}

type ModalHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose?: () => void;
  className?: string;
  titleId?: string;
  children?: ReactNode;
};

export function ModalHeader({ title, subtitle, onClose, className = "", titleId, children }: ModalHeaderProps) {
  return (
    <header className={`modal-header${className ? ` ${className}` : ""}`}>
      <div>
        <h2 id={titleId}>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
      {onClose ? (
        <IconButton type="button" aria-label="Cerrar modal" onClick={onClose}>
          <X size={20} />
        </IconButton>
      ) : null}
    </header>
  );
}

type ConfirmModalProps = {
  title: ReactNode;
  children: ReactNode;
  actions: ReactNode;
  onClose: () => void;
  nested?: boolean;
  className?: string;
};

export function ConfirmModal({ title, children, actions, onClose, nested, className = "" }: ConfirmModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <ModalShell
      className={`confirm-modal${className ? ` ${className}` : ""}`}
      labelledBy={titleId}
      describedBy={descriptionId}
      nested={nested}
      onClose={onClose}
    >
      <h2 id={titleId}>{title}</h2>
      <div id={descriptionId}>{children}</div>
      <div className="confirm-actions">{actions}</div>
    </ModalShell>
  );
}
