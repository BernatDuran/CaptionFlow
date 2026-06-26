import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { PROVIDERS } from "./config/modelCatalog";
import { listModels } from "./config/modelService";
import {
  deleteDiagramForResult,
  deleteResultRecord,
  deleteVideoRecords,
  getDownloadPath,
  listResultHistory,
  readDiagramForResult,
  readResultFile,
  readTranscriptMetadataForResult,
  readResultMetadata,
  readTranscriptTextForResult,
  sanitizeFilename
} from "./files/fileService";
import { markdownToPdfBuffer } from "./files/pdfService";
import { listDiagramPrompts, listPrompts, savePrompt, deletePrompt } from "./prompts/promptService";
import { generateDiagramFromResult } from "./processing/diagramService";
import { getProcessJob, startProcessJob } from "./processing/jobService";
import { AppError, type LocalSettings, type ProviderId } from "./types";
import { getApiKey, readLocalSettings, reloadEnvironment, writeLocalSettings } from "./config/configService";
import {
  createAnalyticsDashboard,
  deleteAnalyticsDashboard,
  listAnalyticsDataset,
  readAnalyticsDashboards,
  updateAnalyticsDashboard
} from "./analytics/analyticsService";

const app = express();
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";
const allowedOrigins = new Set([
  "http://127.0.0.1:5174",
  "http://localhost:5174",
  "http://[::1]:5174"
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError("VALIDATION_ERROR", "Origen no permitido.", 403));
  }
}));
app.use(express.json({ limit: "1mb" }));

function isProvider(value: unknown): value is ProviderId {
  return value === "openai" || value === "google" || value === "nanogpt";
}

app.get("/api/providers", async (_req, res) => {
  const settings = await readLocalSettings();
  res.json({
    providers: PROVIDERS.map((provider) => ({
      ...provider,
      configured: Boolean(getApiKey(provider.id))
    })),
    activeProvider: settings.activeProvider,
    selectedModels: settings.selectedModels,
    adaptiveChunkingEnabled: settings.adaptiveChunkingEnabled,
    minimumModelContextTokens: settings.minimumModelContextTokens,
    outputRootDir: settings.outputRootDir,
    analyticsEnabled: settings.analyticsEnabled
  });
});

app.get("/api/models", async (req, res) => {
  const provider = String(req.query.provider || "");
  if (!isProvider(provider)) {
    throw new AppError("PROVIDER_NOT_CONFIGURED", "Proveedor no válido.", 400);
  }

  res.json({ provider, models: await listModels(provider) });
});

app.get("/api/prompts", async (_req, res) => {
  const prompts = await listPrompts();
  if (prompts.length === 0) {
    throw new AppError("NO_PROMPTS", "No hay prompts disponibles en la carpeta /prompts.", 400);
  }

  res.json({
    prompts: prompts.map(({ id, name, description, outputFilenamePrefix, temperature, content }) => ({
      id,
      name,
      description,
      outputFilenamePrefix,
      temperature,
      content
    }))
  });
});

app.post("/api/prompts", async (req, res) => {
  const prompt = await savePrompt(req.body);
  res.json({ prompt });
});

app.delete("/api/prompts/:id", async (req, res) => {
  await deletePrompt(req.params.id);
  res.json({ success: true });
});

app.get("/api/diagram-prompts", async (_req, res) => {
  const prompts = await listDiagramPrompts();
  if (prompts.length === 0) {
    throw new AppError("NO_PROMPTS", "No hay prompts de diagrama disponibles en la carpeta /prompts/diagrams.", 400);
  }

  res.json({
    prompts: prompts.map(({ id, name, description, diagramType, temperature }) => ({
      id,
      name,
      description,
      diagramType,
      temperature
    }))
  });
});

app.get("/api/settings", async (_req, res) => {
  res.json(await readLocalSettings());
});

app.post("/api/settings", async (req, res) => {
  const body = req.body as Partial<LocalSettings>;
  const outputRootDir = typeof body.outputRootDir === "string" ? body.outputRootDir.trim() : undefined;
  if (!isProvider(body.activeProvider)) {
    throw new AppError("PROVIDER_NOT_CONFIGURED", "Proveedor no válido.", 400);
  }

  const selectedModels = body.selectedModels || {};
  const activeModel = selectedModels[body.activeProvider];
  if (!activeModel) {
    throw new AppError("MODEL_MISSING", "Selecciona un modelo para el proveedor activo.", 400);
  }

  if (outputRootDir) {
    try {
      await fs.mkdir(outputRootDir, { recursive: true });
    } catch (err) {
      throw new AppError("VALIDATION_ERROR", "La ruta de almacenamiento no es válida o no se tienen permisos de escritura.", 400);
    }
  }

  const saved = await writeLocalSettings({
    activeProvider: body.activeProvider,
    selectedModels,
    adaptiveChunkingEnabled: body.adaptiveChunkingEnabled,
    minimumModelContextTokens: body.minimumModelContextTokens,
    outputRootDir,
    analyticsEnabled: body.analyticsEnabled
  });

  res.json(saved);
});

app.post("/api/restart", async (_req, res) => {
  reloadEnvironment();
  const settings = await readLocalSettings();

  res.json({
    ok: true,
    message: "Configuracion recargada.",
    providers: PROVIDERS.map((provider) => ({
      ...provider,
      configured: Boolean(getApiKey(provider.id))
    })),
    activeProvider: settings.activeProvider,
    selectedModels: settings.selectedModels,
    adaptiveChunkingEnabled: settings.adaptiveChunkingEnabled,
    minimumModelContextTokens: settings.minimumModelContextTokens,
    outputRootDir: settings.outputRootDir,
    analyticsEnabled: settings.analyticsEnabled
  });
});

app.get("/api/analytics/settings", async (_req, res) => {
  const settings = await readLocalSettings();
  res.json({
    analyticsEnabled: Boolean(settings.analyticsEnabled),
    dashboards: await readAnalyticsDashboards()
  });
});

app.get("/api/analytics/dataset", async (_req, res) => {
  res.json(await listAnalyticsDataset());
});

app.post("/api/analytics/dashboards", async (req, res) => {
  try {
    res.status(201).json({ dashboard: await createAnalyticsDashboard(req.body) });
  } catch (err) {
    throw new AppError("VALIDATION_ERROR", err instanceof Error ? err.message : "No se pudo guardar el dashboard.", 400);
  }
});

app.put("/api/analytics/dashboards/:id", async (req, res) => {
  try {
    res.json({ dashboard: await updateAnalyticsDashboard(req.params.id, req.body) });
  } catch (err) {
    throw new AppError("VALIDATION_ERROR", err instanceof Error ? err.message : "No se pudo actualizar el dashboard.", 400);
  }
});

app.delete("/api/analytics/dashboards/:id", async (req, res) => {
  try {
    await deleteAnalyticsDashboard(req.params.id);
    res.json({ success: true });
  } catch (err) {
    throw new AppError("VALIDATION_ERROR", err instanceof Error ? err.message : "No se pudo eliminar el dashboard.", 400);
  }
});

app.post("/api/process", async (req, res) => {
  const { youtubeUrl, promptId, customPromptContent, ignoreLimits } = req.body as { youtubeUrl?: string; promptId?: string; customPromptContent?: string; ignoreLimits?: boolean };
  if (!youtubeUrl || !promptId) {
    throw new AppError("VALIDATION_ERROR", "Indica una URL de YouTube y un tipo de procesamiento.", 400);
  }

  const job = startProcessJob({ youtubeUrl, promptId, customPromptContent, ignoreLimits });
  res.status(202).json({ jobId: job.id, status: job.status, step: job.step });
});

app.get("/api/process/:jobId", async (req, res) => {
  res.json(getProcessJob(req.params.jobId));
});

app.get("/api/history", async (_req, res) => {
  res.json({ items: await listResultHistory() });
});

app.delete("/api/history/videos", async (req, res) => {
  const filenames = Array.isArray(req.body?.filenames) ? req.body.filenames.filter((value: unknown) => typeof value === "string") : [];
  res.json(await deleteVideoRecords(filenames));
});

app.get("/api/results/:filename", async (req, res) => {
  const markdown = await readResultFile(req.params.filename);
  const transcriptMetadata = await readTranscriptMetadataForResult(req.params.filename);
  res.json({
    filename: path.basename(req.params.filename),
    markdown,
    downloadUrl: `/api/download/${encodeURIComponent(path.basename(req.params.filename))}`,
    pdfUrl: `/api/pdf/${encodeURIComponent(path.basename(req.params.filename))}`,
    metadata: transcriptMetadata
  });
});

app.get("/api/results/:filename/prompt", async (req, res) => {
  const metadata = await readResultMetadata(req.params.filename);
  res.json({ promptContent: metadata.promptContent || null });
});

app.get("/api/results/:filename/transcript", async (req, res) => {
  const text = await readTranscriptTextForResult(req.params.filename);
  res.json({ transcript: text });
});

app.delete("/api/results/:filename", async (req, res) => {
  res.json(await deleteResultRecord(req.params.filename));
});

app.get("/api/pdf/:filename", async (req, res) => {
  const filename = path.basename(req.params.filename);
  const markdown = await readResultFile(filename);
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || filename.replace(/\.md$/i, "");
  const pdf = await markdownToPdfBuffer(markdown, title);
  const pdfFilename = `${sanitizeFilename(filename.replace(/\.md$/i, ""))}.pdf`;

  const isPreview = req.query.preview === "true";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${isPreview ? "inline" : "attachment"}; filename="${pdfFilename}"`);
  res.send(pdf);
});

app.post("/api/diagram", async (req, res) => {
  const { filename, promptId } = req.body as { filename?: string; promptId?: string };
  if (!filename) {
    throw new AppError("VALIDATION_ERROR", "Selecciona un documento para generar el diagrama.", 400);
  }

  res.json(await generateDiagramFromResult(filename, promptId || "flowchart"));
});

app.get("/api/diagram/:filename", async (req, res) => {
  res.json(
    await readDiagramForResult(req.params.filename, {
      promptId: typeof req.query.promptId === "string" ? req.query.promptId : undefined,
      diagramKind: typeof req.query.kind === "string" ? req.query.kind : undefined
    })
  );
});

app.delete("/api/results/:filename/diagrams", async (req, res) => {
  const { promptId, diagramKind, diagramFilename } = req.body as {
    promptId?: string;
    diagramKind?: string;
    diagramFilename?: string;
  };

  res.json(await deleteDiagramForResult(req.params.filename, { promptId, diagramKind, diagramFilename }));
});

app.get("/api/download/:filename", async (req, res) => {
  const fullPath = getDownloadPath(req.params.filename);
  try {
    await fs.access(fullPath);
  } catch {
    throw new AppError("FILE_NOT_FOUND", "El archivo solicitado no existe.", 404);
  }

  res.download(fullPath, path.basename(fullPath));
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  console.error(error.message);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Ha ocurrido un error inesperado."
    }
  });
});

app.listen(port, host, () => {
  console.log(`CaptionFlow API escuchando en http://${host}:${port}`);
});
