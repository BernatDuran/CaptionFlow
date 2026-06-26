import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";

export type StatusStep = string;

type ProcessingStatusProps = {
  status: StatusStep | "Completado" | "Error" | "";
  isProcessing: boolean;
};

export function ProcessingStatus({ status, isProcessing }: ProcessingStatusProps) {
  if (!status) {
    return (
      <div className="status-line idle">
        <CircleDashed size={18} />
        <span>Listo para procesar</span>
      </div>
    );
  }

  if (status === "Completado") {
    return (
      <div className="status-line complete">
        <CheckCircle2 size={18} />
        <span>Completado</span>
      </div>
    );
  }

  if (status === "Error") {
    return (
      <div className="status-line failed">
        <XCircle size={18} />
        <span>Error</span>
      </div>
    );
  }

  return (
    <div className="status-line active processing-status-active">
      <div className="processing-status-main">
        {isProcessing ? <Loader2 className="spin" size={18} /> : <CircleDashed size={18} />}
        <span>{status}</span>
      </div>
      {isProcessing && (
        <small>El proceso puede tardar un par de minutos</small>
      )}
    </div>
  );
}
