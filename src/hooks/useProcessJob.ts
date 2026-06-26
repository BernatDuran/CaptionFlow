import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../api/client";
import type { ProcessJobResponse, ProcessResult } from "../api/types";
import { formatPlainThousands } from "../utils/formatters";

export type ProcessConfirmation = {
  kind: "unknown-limits" | "chunking";
  title: string;
  message: string;
  primaryLabel: string;
  chips?: string[];
};

type ProcessInput = {
  youtubeUrl: string;
  promptId: string;
  customPromptContent?: string;
};

type UseProcessJobInput = {
  onCompleted?: () => void;
};

const POLL_INTERVAL_MS = 800;
const PROCESS_TIMEOUT_MS = 30 * 60 * 1000;

class JobError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "JobError";
    this.code = code;
  }
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason || new DOMException("Aborted", "AbortError"));
      return;
    }

    const timeout = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(signal.reason || new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

function formatJobStatus(job: Pick<ProcessJobResponse, "step" | "detail">) {
  return job.detail ? `${job.step}: ${job.detail}` : job.step;
}

function extractTokenChips(message: string) {
  const required = message.match(/Requiere ~(\d+)/i)?.[1];
  const safeLimit = message.match(/l[ií]mite seguro es ~(\d+)/i)?.[1];
  return [
    required ? `Necesarios: ~${formatPlainThousands(required)} tok` : "",
    safeLimit ? `Limite seguro: ~${formatPlainThousands(safeLimit)} tok` : ""
  ].filter(Boolean);
}

export function useProcessJob({ onCompleted }: UseProcessJobInput = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [pendingProcessConfirmation, setPendingProcessConfirmation] = useState<ProcessConfirmation | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const pendingInputRef = useRef<ProcessInput | null>(null);
  const runIdRef = useRef(0);

  const cancelActiveRequest = useCallback(() => {
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
  }, []);

  useEffect(() => cancelActiveRequest, [cancelActiveRequest]);

  const pollProcessJob = useCallback(async (jobId: string, signal: AbortSignal) => {
    const deadline = Date.now() + PROCESS_TIMEOUT_MS;

    for (;;) {
      if (Date.now() > deadline) {
        throw new JobError("El proceso sigue tardando demasiado; revisa el historial o reintenta.", "PROCESS_TIMEOUT");
      }

      await wait(POLL_INTERVAL_MS, signal);
      const job = await apiFetch<ProcessJobResponse>(`/api/process/${encodeURIComponent(jobId)}`, {
        signal,
        timeoutMs: 15000
      });
      setStatus(formatJobStatus(job));

      if (job.status === "completed") {
        if (!job.result) {
          throw new Error("El proceso termino sin devolver un documento.");
        }
        return job.result;
      }

      if (job.status === "error") {
        throw new JobError(job.error?.message || "No se pudo procesar el video.", job.error?.code);
      }
    }
  }, []);

  const startProcess = useCallback(
    async (input: ProcessInput, ignoreLimits = false) => {
      cancelActiveRequest();
      const controller = new AbortController();
      activeControllerRef.current = controller;
      pendingInputRef.current = input;
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      setError("");
      setResult(null);
      setPendingProcessConfirmation(null);
      setIsProcessing(true);
      setStatus("Validando URL");

      try {
        const started = await apiFetch<ProcessJobResponse>("/api/process", {
          method: "POST",
          json: { ...input, ignoreLimits },
          signal: controller.signal,
          timeoutMs: 15000
        });

        if (runId !== runIdRef.current) return;

        setStatus(formatJobStatus(started));
        const jobId = started.jobId || started.id;
        if (!jobId) {
          throw new Error("No se pudo iniciar el proceso.");
        }

        const data = await pollProcessJob(jobId, controller.signal);
        if (runId !== runIdRef.current) return;

        setStatus("Completado");
        setResult(data);
        onCompleted?.();
      } catch (err) {
        if (runId !== runIdRef.current) return;
        if (err instanceof ApiError && err.code === "AbortError") return;

        if (err instanceof JobError && err.code === "UNKNOWN_LIMITS") {
          setIsProcessing(false);
          setStatus("Requiere confirmación");
          setPendingProcessConfirmation({
            kind: "unknown-limits",
            title: "Limites de contexto desconocidos",
            message:
              "El modelo seleccionado no tiene limites de contexto registrados. Puedes continuar, pero el proceso podria fallar si la transcripcion es muy larga.",
            primaryLabel: "Continuar"
          });
          return;
        }

        if (err instanceof JobError && err.code === "TOKEN_LIMIT_EXCEEDED") {
          setIsProcessing(false);
          setStatus("Requiere confirmación");
          setPendingProcessConfirmation({
            kind: "chunking",
            title: "Procesar con chunking",
            message: `${err.message} CaptionFlow puede trocear la transcripcion en partes y generar un documento final a partir de ellas. En videos extremadamente largos tambien podria fallar.`,
            primaryLabel: "Usar chunking",
            chips: extractTokenChips(err.message)
          });
          return;
        }

        setStatus("Error");
        setError(err instanceof Error ? err.message : "Ha ocurrido un error inesperado.");
      } finally {
        if (runId === runIdRef.current) {
          setIsProcessing(false);
        }
      }
    },
    [cancelActiveRequest, onCompleted, pollProcessJob]
  );

  const cancelProcessConfirmation = useCallback(() => {
    setPendingProcessConfirmation(null);
    setStatus("Cancelado");
  }, []);

  const confirmProcessWithChunking = useCallback(() => {
    const pendingInput = pendingInputRef.current;
    if (!pendingInput) return;
    setPendingProcessConfirmation(null);
    void startProcess(pendingInput, true);
  }, [startProcess]);

  return {
    cancelProcessConfirmation,
    confirmProcessWithChunking,
    error,
    isProcessing,
    pendingProcessConfirmation,
    result,
    setError,
    setResult,
    startProcess,
    status
  };
}
