import { randomUUID } from "node:crypto";
import { AppError } from "../types";
import { processVideo, type ProcessVideoResult } from "./processingService";

type ProcessJobStatus = "queued" | "running" | "completed" | "error";

export type ProcessJobSnapshot = {
  id: string;
  status: ProcessJobStatus;
  step: string;
  detail?: string;
  result?: ProcessVideoResult;
  error?: {
    code?: string;
    message: string;
  };
  createdAt: string;
  updatedAt: string;
};

const jobs = new Map<string, ProcessJobSnapshot>();
const JOB_TTL_MS = 1000 * 60 * 60;

function now() {
  return new Date().toISOString();
}

function updateJob(id: string, patch: Partial<ProcessJobSnapshot>) {
  const current = jobs.get(id);
  if (!current) return;
  jobs.set(id, {
    ...current,
    ...patch,
    updatedAt: now()
  });
}

function cleanupOldJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs.entries()) {
    if (Date.parse(job.updatedAt) < cutoff) {
      jobs.delete(id);
    }
  }
}

export function startProcessJob(input: { youtubeUrl: string; promptId: string; customPromptContent?: string; ignoreLimits?: boolean }) {
  cleanupOldJobs();

  const id = randomUUID();
  const createdAt = now();
  const job: ProcessJobSnapshot = {
    id,
    status: "queued",
    step: "En cola",
    createdAt,
    updatedAt: createdAt
  };

  jobs.set(id, job);

  void (async () => {
    try {
      updateJob(id, {
        status: "running",
        step: "Validando URL"
      });

      const result = await processVideo({
        youtubeUrl: input.youtubeUrl,
        promptId: input.promptId,
        customPromptContent: input.customPromptContent,
        ignoreLimits: input.ignoreLimits,
        onProgress: (step, detail) => {
          updateJob(id, {
            status: "running",
            step,
            detail
          });
        }
      });

      updateJob(id, {
        status: "completed",
        step: "Completado",
        result
      });
    } catch (error) {
      const appError = error instanceof AppError ? error : undefined;
      updateJob(id, {
        status: "error",
        step: "Error",
        error: {
          code: appError?.code,
          message: error instanceof Error ? error.message : "Ha ocurrido un error inesperado."
        }
      });
    }
  })();

  return jobs.get(id) as ProcessJobSnapshot;
}

export function getProcessJob(id: string) {
  const job = jobs.get(id);
  if (!job) {
    throw new AppError("PROCESS_JOB_NOT_FOUND", "No se encontro el proceso solicitado.", 404);
  }

  return job;
}
