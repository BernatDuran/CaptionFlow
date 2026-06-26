import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { AppError, type HistoryItem, type OperationRun, type ResultMetadata, type UsageTotal, type UsageTotals } from "../types";
import { getRootDir, getCachedSettings } from "../config/configService";

const paths = {
  get OUTPUT_DIR() {
    const settings = getCachedSettings();
    return settings.outputRootDir || path.join(getRootDir(), "output");
  },
  get TRANSCRIPTS_DIR() {
    return path.join(this.OUTPUT_DIR, "transcripts");
  },
  get BY_VIDEO_DIR() {
    return path.join(this.TRANSCRIPTS_DIR, "by-video");
  },
  get RESULTS_DIR() {
    return path.join(this.OUTPUT_DIR, "results");
  },
  get DIAGRAMS_DIR() {
    return path.join(this.OUTPUT_DIR, "diagrams");
  }
};

type DiagramMatch = {
  filename: string;
  fullPath: string;
  kind: string;
  label: string;
  createdAt: string;
  updatedAt: string;
};

export type DeleteResultSummary = {
  success: true;
  deleted: {
    videos: number;
    results: number;
    metadata: number;
    diagrams: number;
    transcripts: number;
    transcriptCaches: number;
  };
};

function emptyUsageTotal(): UsageTotal {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    durationMs: 0,
    unavailableUsageRuns: 0
  };
}

function addRunToTotal(total: UsageTotal, run: OperationRun) {
  total.durationMs += run.durationMs;
  if (run.usageSource === "unavailable") {
    total.unavailableUsageRuns += 1;
  }
  if (typeof run.inputTokens === "number") total.inputTokens += run.inputTokens;
  if (typeof run.outputTokens === "number") total.outputTokens += run.outputTokens;
  if (typeof run.totalTokens === "number") total.totalTokens += run.totalTokens;
}

export function calculateUsageTotals(runs: OperationRun[] = []): UsageTotals {
  const totals: UsageTotals = {
    document: emptyUsageTotal(),
    diagrams: emptyUsageTotal(),
    transcript: emptyUsageTotal(),
    all: emptyUsageTotal()
  };

  for (const run of runs) {
    addRunToTotal(totals.all, run);
    if (run.scope === "document") addRunToTotal(totals.document, run);
    if (run.scope === "diagram") addRunToTotal(totals.diagrams, run);
    if (run.scope === "transcript") addRunToTotal(totals.transcript, run);
  }

  return totals;
}

function calculateLatestDiagramRuns(runs: OperationRun[] = []) {
  return runs
    .filter((run) => run.operation === "diagram_generation" && run.diagramType)
    .reduce<Record<string, string>>((acc, run) => {
      acc[run.diagramType as string] = run.runId;
      return acc;
    }, {});
}

function normalizeMetadata(metadata: Partial<ResultMetadata>): Partial<ResultMetadata> {
  const aiRuns = metadata.aiRuns || [];
  return {
    ...metadata,
    aiRuns,
    usageTotals: calculateUsageTotals(aiRuns),
    latestDiagramRuns: calculateLatestDiagramRuns(aiRuns)
  };
}

export function getDiagramInfo(mermaid: string) {
  const firstLine = mermaid
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return { kind: "unknown", label: "Generado" };
  if (/^(flowchart|graph)\b/i.test(firstLine)) return { kind: "flowchart", label: "Flujo" };
  if (/^timeline\b/i.test(firstLine)) return { kind: "timeline", label: "Linea temporal" };
  if (/^mindmap\b/i.test(firstLine)) return { kind: "mindmap", label: "Mapa mental" };
  if (/^sequenceDiagram\b/i.test(firstLine)) return { kind: "sequenceDiagram", label: "Secuencia" };

  return { kind: firstLine.split(/\s+/)[0], label: "Generado" };
}

function getResultDiagramBase(resultFilename: string) {
  return sanitizeFilename(path.basename(resultFilename).replace(/\.md$/i, ""));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPromptIdFromDiagramFilename(filename: string, resultFilename: string) {
  const base = getResultDiagramBase(resultFilename);
  const match = filename.match(new RegExp(`^${escapeRegExp(base)}-diagram(?:-(.+))?\\.mmd$`, "i"));
  return match?.[1];
}

export function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .toLowerCase();
}

export function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export async function ensureOutputDirs() {
  await fs.mkdir(paths.TRANSCRIPTS_DIR, { recursive: true });
  await fs.mkdir(paths.BY_VIDEO_DIR, { recursive: true });
  await fs.mkdir(paths.RESULTS_DIR, { recursive: true });
  await fs.mkdir(paths.DIAGRAMS_DIR, { recursive: true });
}

export async function saveCanonicalTranscript(
  videoId: string | undefined,
  url: string,
  language: string | undefined,
  source: "official" | "automatic",
  fullContent: string
) {
  await ensureOutputDirs();
  const hash = createHash("sha256").update(fullContent).digest("hex");
  const fallbackId = createHash("md5").update(url).digest("hex").slice(0, 12);
  const safeId = videoId ? sanitizeFilename(videoId) : fallbackId;
  const safeLang = language ? sanitizeFilename(language) : "unknown";
  const filename = `${safeId}.${safeLang}.${source}.txt`;
  const fullPath = path.join(paths.BY_VIDEO_DIR, filename);
  
  try {
    await fs.access(fullPath);
  } catch {
    await fs.writeFile(fullPath, fullContent, "utf8");
  }
  
  return { transcriptRef: `by-video/${filename}`, transcriptHash: hash };
}

export async function saveResult(baseName: string, markdown: string) {
  await ensureOutputDirs();
  const filename = `${sanitizeFilename(baseName)}.md`;
  const fullPath = path.join(paths.RESULTS_DIR, filename);
  await fs.writeFile(fullPath, markdown, "utf8");
  return { filename, fullPath };
}

function getMetadataPath(filename: string) {
  const safe = sanitizeFilename(path.basename(filename).replace(/\.md$/i, ""));
  return path.join(paths.RESULTS_DIR, `${safe}.meta.json`);
}

function normalizeResultFilename(filename: string) {
  const safe = path.basename(filename || "");
  if (!safe || safe !== filename || !safe.toLowerCase().endsWith(".md")) {
    throw new AppError("VALIDATION_ERROR", "Documento no valido.", 400);
  }

  return safe;
}

function assertPathInside(baseDir: string, targetPath: string) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(`${resolvedBase}${path.sep}`)) {
    throw new AppError("FILE_NOT_FOUND", "Archivo no encontrado.", 404);
  }

  return resolvedTarget;
}

export async function saveResultMetadata(filename: string, metadata: ResultMetadata) {
  await ensureOutputDirs();
  const fullPath = getMetadataPath(filename);
  await fs.writeFile(fullPath, JSON.stringify(normalizeMetadata(metadata), null, 2), "utf8");
  return { filename: path.basename(fullPath), fullPath };
}

async function writeResultMetadata(filename: string, metadata: Partial<ResultMetadata>) {
  await ensureOutputDirs();
  const fullPath = getMetadataPath(filename);
  await fs.writeFile(fullPath, JSON.stringify(normalizeMetadata(metadata), null, 2), "utf8");
}

export async function readResultMetadata(filename: string): Promise<Partial<ResultMetadata>> {
  await ensureOutputDirs();
  try {
    const raw = await fs.readFile(getMetadataPath(filename), "utf8");
    return normalizeMetadata(JSON.parse(raw) as ResultMetadata);
  } catch {
    return {};
  }
}

export async function appendResultRuns(filename: string, runs: OperationRun[]) {
  const current = await readResultMetadata(filename);
  const next = normalizeMetadata({
    ...current,
    resultFilename: current.resultFilename || path.basename(filename),
    aiRuns: [...(current.aiRuns || []), ...runs]
  });
  await fs.writeFile(getMetadataPath(filename), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function getDownloadPath(filename: string) {
  const safe = path.basename(filename);
  return assertPathInside(paths.RESULTS_DIR, path.join(paths.RESULTS_DIR, safe));
}

export async function readResultFile(filename: string) {
  const fullPath = getDownloadPath(filename);
  try {
    return await fs.readFile(fullPath, "utf8");
  } catch {
    throw new AppError("FILE_NOT_FOUND", "El documento solicitado no existe.", 404);
  }
}

async function removeFileIfExists(fullPath: string) {
  try {
    await fs.access(fullPath);
    await fs.rm(fullPath, { force: true });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function readResultRecord(filename: string) {
  const safe = normalizeResultFilename(filename);
  const markdown = await readResultFile(safe);
  const metadata = await readResultMetadata(safe);
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || safe.replace(/\.md$/i, "");
  return { filename: safe, metadata, title };
}

function getHistoryGroupKey(record: { filename: string; metadata: Partial<ResultMetadata>; title: string }) {
  return record.metadata.videoUrl || record.metadata.videoTitle || record.metadata.title || record.title || record.filename;
}

async function listRemainingResultMetadata(excludedFilenames: Set<string>) {
  await ensureOutputDirs();
  const entries = await fs.readdir(paths.RESULTS_DIR, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md") && !excludedFilenames.has(entry.name))
    .map((entry) => entry.name);

  return Promise.all(files.map((filename) => readResultMetadata(filename)));
}

async function deleteUnreferencedTranscriptArtifacts(deletedMetadata: Partial<ResultMetadata>[], excludedFilenames: Set<string>) {
  const remaining = await listRemainingResultMetadata(excludedFilenames);
  let transcripts = 0;
  let transcriptCaches = 0;

  const candidateRefs = new Set(deletedMetadata.map((metadata) => metadata.transcriptRef).filter(Boolean));
  for (const transcriptRef of candidateRefs) {
    const isStillReferenced = remaining.some((metadata) => metadata.transcriptRef === transcriptRef);
    if (isStillReferenced) continue;

    const transcriptPath = assertPathInside(paths.TRANSCRIPTS_DIR, path.join(paths.TRANSCRIPTS_DIR, transcriptRef as string));
    if (await removeFileIfExists(transcriptPath)) transcripts += 1;
  }

  const candidateVideoIds = new Set(deletedMetadata.map((metadata) => metadata.videoId).filter(Boolean));
  for (const videoId of candidateVideoIds) {
    const isStillReferenced = remaining.some((metadata) => metadata.videoId === videoId);
    if (isStillReferenced) continue;

    const cacheDir = path.join(paths.TRANSCRIPTS_DIR, "cache");
    const cachePath = assertPathInside(cacheDir, path.join(cacheDir, `${sanitizeFilename(videoId as string)}.json`));
    if (await removeFileIfExists(cachePath)) transcriptCaches += 1;
  }

  return { transcripts, transcriptCaches };
}

async function deleteResultRecords(filenames: string[], videos: number): Promise<DeleteResultSummary> {
  const uniqueFilenames = Array.from(new Set(filenames.map(normalizeResultFilename)));
  if (uniqueFilenames.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Selecciona al menos un documento para eliminar.", 400);
  }

  const records = await Promise.all(uniqueFilenames.map((filename) => readResultRecord(filename)));
  const deletedMetadata = records.map((record) => record.metadata);
  let diagrams = 0;
  let results = 0;
  let metadata = 0;

  for (const record of records) {
    const resultPath = getDownloadPath(record.filename);
    const metadataPath = getMetadataPath(record.filename);
    const diagramFiles = await findDiagramsForResult(record.filename);

    for (const diagram of diagramFiles) {
      if (await removeFileIfExists(diagram.fullPath)) diagrams += 1;
    }

    if (await removeFileIfExists(resultPath)) results += 1;
    if (await removeFileIfExists(metadataPath)) metadata += 1;
  }

  const transcriptCleanup = await deleteUnreferencedTranscriptArtifacts(deletedMetadata, new Set(uniqueFilenames));

  return {
    success: true,
    deleted: {
      videos,
      results,
      metadata,
      diagrams,
      transcripts: transcriptCleanup.transcripts,
      transcriptCaches: transcriptCleanup.transcriptCaches
    }
  };
}

export async function deleteResultRecord(filename: string) {
  return deleteResultRecords([filename], 0);
}

export async function deleteVideoRecords(filenames: string[]) {
  const uniqueFilenames = Array.from(new Set(filenames.map(normalizeResultFilename)));
  if (uniqueFilenames.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Selecciona al menos un documento para eliminar.", 400);
  }

  const records = await Promise.all(uniqueFilenames.map((filename) => readResultRecord(filename)));
  const groupKeys = new Set(records.map(getHistoryGroupKey));

  if (groupKeys.size !== 1) {
    throw new AppError("VALIDATION_ERROR", "Solo se puede eliminar un video cada vez.", 400);
  }

  return deleteResultRecords(uniqueFilenames, 1);
}

export async function readTranscriptMetadataForResult(filename: string) {
  await ensureOutputDirs();
  const savedMetadata = await readResultMetadata(filename);
  if (savedMetadata.videoUrl || savedMetadata.videoTitle || savedMetadata.provider) {
    return {
      ...savedMetadata,
      title: savedMetadata.videoTitle || savedMetadata.title,
      videoUrl: savedMetadata.videoUrl
    };
  }

  const transcriptRef = savedMetadata.transcriptRef;
  if (!transcriptRef) return {};
  
  const fullPath = assertPathInside(paths.TRANSCRIPTS_DIR, path.join(paths.TRANSCRIPTS_DIR, transcriptRef));

  try {
    const transcript = await fs.readFile(fullPath, "utf8");
    return {
      title: transcript.match(/^- Titulo:\s*(.+)$/m)?.[1]?.trim(),
      videoUrl: transcript.match(/^- URL:\s*(.+)$/m)?.[1]?.trim()
    };
  } catch {
    return {};
  }
}

export async function readTranscriptTextForResult(filename: string) {
  await ensureOutputDirs();
  const savedMetadata = await readResultMetadata(filename);
  const transcriptRef = savedMetadata.transcriptRef;
  if (!transcriptRef) {
    throw new AppError("FILE_NOT_FOUND", "No se encontro la referencia de la transcripcion.", 404);
  }
  
  const fullPath = assertPathInside(paths.TRANSCRIPTS_DIR, path.join(paths.TRANSCRIPTS_DIR, transcriptRef));
  try {
    const content = await fs.readFile(fullPath, "utf8");
    const text = content
      .replace(/^[\s\S]+?- Fecha de procesamiento: .*?\r?\n\r?\n/m, "")
      .replace(/^(?:Kind:.*|Language:.*)\r?\n?/gim, "")
      .trim();
    return text;
  } catch {
    throw new AppError("FILE_NOT_FOUND", "No se pudo leer la transcripcion original.", 404);
  }
}

export async function listResultHistory(): Promise<HistoryItem[]> {
  await ensureOutputDirs();
  const entries = await fs.readdir(paths.RESULTS_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"));

  const items = await Promise.all(
    files.map(async (entry) => {
      const fullPath = path.join(paths.RESULTS_DIR, entry.name);
      const stat = await fs.stat(fullPath);
      const markdown = await fs.readFile(fullPath, "utf8").catch(() => "");
      const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || entry.name.replace(/\.md$/i, "");
      const metadata = await readResultMetadata(entry.name);
      const diagrams = await findDiagramsForResult(entry.name);
      const firstDiagram = diagrams[0];

      return {
        filename: entry.name,
        downloadUrl: `/api/download/${encodeURIComponent(entry.name)}`,
        pdfUrl: `/api/pdf/${encodeURIComponent(entry.name)}`,
        hasDiagram: diagrams.length > 0,
        diagramFilename: firstDiagram?.filename,
        diagramKind: firstDiagram?.kind,
        diagramLabel: firstDiagram?.label,
        diagramKinds: diagrams.map((diagram) => diagram.kind),
        diagramLabels: diagrams.map((diagram) => diagram.label),
        diagramCount: diagrams.length,
        title,
        videoTitle: metadata.videoTitle || metadata.title,
        videoUrl: metadata.videoUrl,
        channelName: metadata.channelName,
        provider: metadata.provider,
        model: metadata.model,
        promptName: metadata.promptName,
        usageTotals: metadata.usageTotals,
        latestDiagramRuns: metadata.latestDiagramRuns,
        aiRuns: metadata.aiRuns,
        transcriptWords: metadata.transcriptWords,
        outputWords: metadata.outputWords,
        durationSeconds: metadata.durationSeconds,
        durationText: metadata.durationText,
        uploadDate: metadata.uploadDate,
        transcriptLanguage: metadata.transcriptLanguage,
        transcriptSource: metadata.transcriptSource,
        processedAt: metadata.processedAt,
        createdAt: stat.birthtime.toISOString(),
        size: stat.size
      };
    })
  );

  return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function saveDiagram(baseName: string, mermaid: string) {
  await ensureOutputDirs();
  const filename = `${sanitizeFilename(baseName)}.mmd`;
  const fullPath = path.join(paths.DIAGRAMS_DIR, filename);
  await fs.writeFile(fullPath, mermaid, "utf8");
  return { filename, fullPath };
}

export async function findDiagramsForResult(resultFilename: string): Promise<DiagramMatch[]> {
  await ensureOutputDirs();
  const base = getResultDiagramBase(resultFilename);
  const basePattern = escapeRegExp(base);
  const entries = await fs.readdir(paths.DIAGRAMS_DIR, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && new RegExp(`^${basePattern}-diagram(?:-.+)?\\.mmd$`, "i").test(entry.name))
    .map((entry) => entry.name);

  const diagrams = await Promise.all(
    files.map(async (filename) => {
      const fullPath = path.join(paths.DIAGRAMS_DIR, filename);
      const stat = await fs.stat(fullPath);
      const mermaid = await fs.readFile(fullPath, "utf8").catch(() => "");
      const info = getDiagramInfo(mermaid);

      return {
        filename,
        fullPath,
        kind: info.kind,
        label: info.label,
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString()
      };
    })
  );

  return diagrams.sort((a, b) => {
    const aLegacy = getPromptIdFromDiagramFilename(a.filename, resultFilename) ? 1 : 0;
    const bLegacy = getPromptIdFromDiagramFilename(b.filename, resultFilename) ? 1 : 0;
    if (aLegacy !== bLegacy) return bLegacy - aLegacy;
    return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
  });
}

export async function findDiagramForResult(resultFilename: string) {
  return (await findDiagramsForResult(resultFilename))[0];
}

export async function readDiagramForResult(resultFilename: string, input?: { promptId?: string; diagramKind?: string }) {
  const diagrams = await findDiagramsForResult(resultFilename);
  const safePromptId = input?.promptId ? sanitizeFilename(input.promptId) : undefined;
  const direct = safePromptId
    ? diagrams.find((diagram) => getPromptIdFromDiagramFilename(diagram.filename, resultFilename) === safePromptId)
    : undefined;
  const byKind = input?.diagramKind ? diagrams.find((diagram) => diagram.kind === input.diagramKind) : undefined;
  const diagram = direct || byKind || diagrams[0];

  if (!diagram) {
    throw new AppError("FILE_NOT_FOUND", "Todavia no hay un diagrama guardado para este documento.", 404);
  }

  try {
    const mermaid = await fs.readFile(diagram.fullPath, "utf8");
    const info = getDiagramInfo(mermaid);
    return {
      filename: diagram.filename,
      mermaid,
      diagramKind: info.kind,
      diagramLabel: info.label
    };
  } catch {
    throw new AppError("FILE_NOT_FOUND", "No se pudo leer el diagrama guardado.", 404);
  }
}

export async function deleteDiagramForResult(resultFilename: string, input: { promptId?: string; diagramKind?: string; diagramFilename?: string }) {
  const safeResultFilename = normalizeResultFilename(resultFilename);
  await readResultFile(safeResultFilename);

  const diagrams = await findDiagramsForResult(safeResultFilename);
  const safePromptId = input.promptId ? sanitizeFilename(input.promptId) : undefined;
  const safeDiagramFilename = input.diagramFilename ? path.basename(input.diagramFilename) : undefined;
  const byFilename = safeDiagramFilename ? diagrams.find((diagram) => diagram.filename === safeDiagramFilename) : undefined;
  const byPrompt = safePromptId
    ? diagrams.find((diagram) => getPromptIdFromDiagramFilename(diagram.filename, safeResultFilename) === safePromptId)
    : undefined;
  const byKind = input.diagramKind ? diagrams.find((diagram) => diagram.kind === input.diagramKind) : undefined;
  const diagram = byFilename || byPrompt || byKind;

  if (!diagram) {
    throw new AppError("FILE_NOT_FOUND", "No se encontro el diagrama solicitado.", 404);
  }

  const diagramPromptId = getPromptIdFromDiagramFilename(diagram.filename, safeResultFilename);
  const metadata = await readResultMetadata(safeResultFilename);
  const aiRuns = (metadata.aiRuns || []).filter((run) => {
    if (run.operation !== "diagram_generation") return true;
    if (diagramPromptId) return sanitizeFilename(run.diagramPromptId || "") !== diagramPromptId;
    if (safePromptId) return sanitizeFilename(run.diagramPromptId || "") !== safePromptId;
    return run.diagramType !== diagram.kind;
  });

  const deleted = await removeFileIfExists(diagram.fullPath);
  await writeResultMetadata(safeResultFilename, {
    ...metadata,
    aiRuns,
    latestDiagramRuns: calculateLatestDiagramRuns(aiRuns)
  });

  return {
    success: true,
    deleted: {
      videos: 0,
      results: 0,
      metadata: 0,
      diagrams: deleted ? 1 : 0,
      transcripts: 0,
      transcriptCaches: 0
    }
  } satisfies DeleteResultSummary;
}
