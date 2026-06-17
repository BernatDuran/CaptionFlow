import { randomUUID } from "node:crypto";
import { generateText } from "../ai/aiClient";
import { assertApiKey, getActiveProviderAndModel, getAdaptiveChunkSizeChars, getDynamicMaxTranscriptChars, getModelContextTokens, readLocalSettings } from "../config/configService";
import { listModels } from "../config/modelService";
import { calculateUsageTotals, saveResult, saveResultMetadata, saveCanonicalTranscript, timestampForFilename } from "../files/fileService";
import { getPromptById } from "../prompts/promptService";
import { assertValidYoutubeUrl, getYoutubeTranscript } from "../youtube/transcriptService";
import { AppError, type GenerateTextResult, type OperationRun, type ProviderId } from "../types";

export type ProgressReporter = (step: string, detail?: string) => void;

function buildFinalPrompt(input: {
  instruction: string;
  videoTitle?: string;
  videoUrl: string;
  processedAt: string;
  transcript: string;
}) {
  return `${input.instruction}

---

Metadatos del video:
- Titulo: ${input.videoTitle || "Sin titulo disponible"}
- URL: ${input.videoUrl}
- Fecha de procesamiento: ${input.processedAt}

Transcripcion completa:

${input.transcript}
`;
}

function semanticSplitWithOverlap(text: string, chunkSize: number, overlapChars: number) {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    if (startIndex + chunkSize >= text.length) {
      chunks.push(text.slice(startIndex));
      break;
    }

    let endIndex = startIndex + chunkSize;
    
    const lastDoubleNewline = text.lastIndexOf("\n\n", endIndex);
    const lastPeriod = text.lastIndexOf(". ", endIndex);

    if (lastDoubleNewline > startIndex) {
      endIndex = lastDoubleNewline + 2;
    } else if (lastPeriod > startIndex) {
      endIndex = lastPeriod + 2;
    }

    chunks.push(text.slice(startIndex, endIndex));

    if (endIndex >= text.length) break;

    let nextStart = Math.max(startIndex, endIndex - overlapChars);
    
    const nextStartPeriod = text.indexOf(". ", nextStart);
    if (nextStartPeriod !== -1 && nextStartPeriod < endIndex) {
      nextStart = nextStartPeriod + 2;
    } else {
       const nextStartNewline = text.indexOf("\n", nextStart);
       if (nextStartNewline !== -1 && nextStartNewline < endIndex) {
         nextStart = nextStartNewline + 1;
       }
    }
    
    startIndex = nextStart;
  }
  return chunks;
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  
  const worker = async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index], index);
    }
  };
  
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function createAiRun(input: {
  operation: "chunk_summary" | "document_generation";
  provider: ProviderId;
  model: string;
  promptId: string;
  result: GenerateTextResult;
}): OperationRun {
  return {
    runId: randomUUID(),
    operation: input.operation,
    scope: "document",
    provider: input.provider,
    model: input.model,
    promptId: input.promptId,
    diagramPromptId: null,
    diagramType: null,
    startedAt: input.result.timing.startedAt,
    finishedAt: input.result.timing.finishedAt,
    durationMs: input.result.timing.durationMs,
    inputTokens: input.result.usage.inputTokens,
    outputTokens: input.result.usage.outputTokens,
    totalTokens: input.result.usage.totalTokens,
    cachedInputTokens: input.result.usage.cachedInputTokens,
    reasoningTokens: input.result.usage.reasoningTokens,
    usageSource: input.result.usage.source
  };
}

async function prepareTranscriptForPrompt(input: {
  provider: ProviderId;
  model: string;
  promptId: string;
  instruction: string;
  transcript: string;
  temperature: number;
  settings: Awaited<ReturnType<typeof readLocalSettings>>;
  modelContextTokens?: number | null;
  onProgress?: ProgressReporter;
}) {
  const modelContextTokensUsed = getModelContextTokens(input.provider, input.model, input.modelContextTokens);
  const maxTranscriptChars = getDynamicMaxTranscriptChars(input.provider, input.model, modelContextTokensUsed);
  if (input.transcript.length <= maxTranscriptChars) {
    return {
      transcriptForPrompt: input.transcript,
      chunked: false,
      chunks: 1,
      runs: [] as OperationRun[],
      chunkingStrategy: "none" as const,
      chunkSizeChars: null,
      chunkOverlapChars: null,
      modelContextTokensUsed
    };
  }

  const chunkSizeChars = getAdaptiveChunkSizeChars(input.settings, input.provider, input.model, input.modelContextTokens);
  const chunkOverlapChars = Math.min(800, Math.floor(chunkSizeChars * 0.08));
  const chunks = semanticSplitWithOverlap(input.transcript, chunkSizeChars, chunkOverlapChars);
  const runs: OperationRun[] = [];

  input.onProgress?.("Procesando partes con IA (3/6)", `Procesando ${chunks.length} partes en paralelo (con contexto original)`);

  const results = await mapWithConcurrency(chunks, 4, async (chunk, index) => {
    const summary = await generateText({
      provider: input.provider,
      model: input.model,
      temperature: Math.min(input.temperature, 0.3),
      prompt: `Este es un fragmento de una transcripcion de YouTube. Extrae y consolida UNICAMENTE la informacion que sirva para cumplir este objetivo final del usuario: "${input.instruction}". Manten todos los datos tecnicos, nombres o detalles clave relevantes para el objetivo. No inventes nada.

Parte ${index + 1} de ${chunks.length}:

${chunk}`
    });
    return { index, summary };
  });

  const summaries: string[] = [];
  for (const { index, summary } of results) {
    runs.push(
      createAiRun({
        operation: "chunk_summary",
        provider: input.provider,
        model: input.model,
        promptId: input.promptId,
        result: summary
      })
    );
    summaries.push(`## Parte ${index + 1}\n\n${summary.text}`);
  }

  return {
    transcriptForPrompt: `La transcripcion original era larga y se ha procesado por partes extrayendo informacion relevante para el objetivo principal antes de la sintesis final.\n\n${summaries.join("\n\n")}`,
    chunked: true,
    chunks: chunks.length,
    runs,
    chunkingStrategy: input.settings.adaptiveChunkingEnabled ? "adaptive" as const : "fixed" as const,
    chunkSizeChars,
    chunkOverlapChars,
    modelContextTokensUsed
  };
}

export async function processVideo(input: { youtubeUrl: string; promptId: string; customPromptContent?: string; ignoreLimits?: boolean; onProgress?: ProgressReporter }) {
  input.onProgress?.("Validando URL (1/6)");
  assertValidYoutubeUrl(input.youtubeUrl);
  const { provider, model } = await getActiveProviderAndModel();
  assertApiKey(provider);
  const prompt = await getPromptById(input.promptId);
  if (input.customPromptContent) {
    prompt.content = input.customPromptContent;
    prompt.name = "Prompt personalizado";
    prompt.id = "custom";
  }

  input.onProgress?.("Obteniendo subtitulos (2/6)");
  const video = await getYoutubeTranscript(input.youtubeUrl);
  const processedAt = new Date().toISOString();
  const transcriptWords = countWords(video.transcript);

  input.onProgress?.(
    video.cached ? "Transcripcion recuperada de cache (2/6)" : "Transcripcion obtenida (2/6)",
    video.language ? `Idioma: ${video.language}` : undefined
  );

  const settings = await readLocalSettings();
  const selectedModelLimits = (await listModels(provider)).find((listedModel) => listedModel.id === model)?.limits;
  const modelContextTokensUsed = getModelContextTokens(provider, model, selectedModelLimits?.maxInputTokens);

  if (
    modelContextTokensUsed &&
    settings.minimumModelContextTokens &&
    modelContextTokensUsed < settings.minimumModelContextTokens
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      `El modelo seleccionado tiene ${modelContextTokensUsed.toLocaleString("es")} tokens de contexto, por debajo del mínimo configurado de ${settings.minimumModelContextTokens.toLocaleString("es")}.`,
      400
    );
  }

  if (!settings.adaptiveChunkingEnabled && !input.ignoreLimits) {
    const maxInputTokens = selectedModelLimits?.maxInputTokens ?? modelContextTokensUsed;

    if (!maxInputTokens || (selectedModelLimits?.source === "unknown" && !modelContextTokensUsed)) {
      throw new AppError("UNKNOWN_LIMITS", "El modelo seleccionado no tiene límites de contexto registrados.", 400);
    }

    const estimatedTranscriptTokens = Math.ceil(video.transcript.length / 4);
    const estimatedPromptTokens = Math.ceil(prompt.content.length / 4);
    const reservedOutputTokens = 2000;
    const threshold = maxInputTokens * 0.85;

    if (estimatedTranscriptTokens + estimatedPromptTokens + reservedOutputTokens > threshold) {
      throw new AppError(
        "TOKEN_LIMIT_EXCEEDED",
        `La transcripción es demasiado larga para este modelo. Requiere ~${estimatedTranscriptTokens} tokens, pero el límite seguro es ~${Math.floor(threshold)} tokens.`,
        400
      );
    }
  }

  const baseName = `${prompt.outputFilenamePrefix}-${timestampForFilename(new Date())}`;
  const transcriptHeader = `# Transcripcion

- Titulo: ${video.title || "Sin titulo disponible"}
- URL: ${video.url}
- ID video: ${video.videoId || "desconocido"}
- Canal: ${video.channelName || "desconocido"}
- Duracion: ${video.durationText || (video.durationSeconds ? `${video.durationSeconds}s` : "desconocida")}
- Fuente: ${video.source}
- Idioma: ${video.language || "desconocido"}
- Palabras transcripcion: ${transcriptWords}
- Provider IA: ${provider}
- Modelo IA: ${model}
- Prompt: ${prompt.name}
- Fecha de procesamiento: ${processedAt}

${video.transcript}
`;

  input.onProgress?.("Preparando prompt (3/6)");
  const canonical = await saveCanonicalTranscript(
    video.videoId,
    video.url,
    video.language,
    video.source,
    transcriptHeader
  );
  const prepared = await prepareTranscriptForPrompt({
    provider,
    model,
    promptId: prompt.id,
    instruction: prompt.content,
    transcript: video.transcript,
    temperature: prompt.temperature,
    settings,
    modelContextTokens: modelContextTokensUsed,
    onProgress: input.onProgress
  });

  input.onProgress?.("Generando documento (4/6)");
  const finalPrompt = buildFinalPrompt({
    instruction: prompt.content,
    videoTitle: video.title,
    videoUrl: video.url,
    processedAt,
    transcript: prepared.transcriptForPrompt
  });

  if (finalPrompt.length > getDynamicMaxTranscriptChars(provider, model, modelContextTokensUsed)) {
    throw new AppError(
      "TRANSCRIPT_TOO_LONG",
      "La transcripcion es demasiado larga para procesarla con la configuracion actual.",
      400
    );
  }

  input.onProgress?.("Enviando a IA (5/6)");
  const documentResult = await generateText({
    provider,
    model,
    prompt: finalPrompt,
    temperature: prompt.temperature
  });
  const markdown = documentResult.text;
  const documentRun = createAiRun({
    operation: "document_generation",
    provider,
    model,
    promptId: prompt.id,
    result: documentResult
  });

  input.onProgress?.("Guardando resultado (6/6)");
  const resultFile = await saveResult(baseName, markdown);
  const outputWords = markdown.split(/\s+/).filter(Boolean).length;
  const aiRuns = [...(video.runs || []), ...prepared.runs, documentRun];
  const usageTotals = calculateUsageTotals(aiRuns);
  await saveResultMetadata(resultFile.filename, {
    provider,
    model,
    promptId: prompt.id,
    promptName: prompt.name,
    promptContent: prompt.content,
    resultFilename: resultFile.filename,
    transcriptRef: canonical.transcriptRef,
    transcriptHash: canonical.transcriptHash,
    processedAt,
    title: video.title,
    videoTitle: video.title,
    videoUrl: video.url,
    videoId: video.videoId,
    channelName: video.channelName,
    durationSeconds: video.durationSeconds,
    durationText: video.durationText,
    uploadDate: video.uploadDate,
    transcriptLanguage: video.language,
    transcriptSource: video.source,
    transcriptCached: Boolean(video.cached),
    transcriptWords,
    transcriptChars: video.transcript.length,
    outputWords,
    chunked: prepared.chunked,
    chunks: prepared.chunks,
    chunkingStrategy: prepared.chunkingStrategy,
    chunkSizeChars: prepared.chunkSizeChars,
    chunkOverlapChars: prepared.chunkOverlapChars,
    modelContextTokensUsed: prepared.modelContextTokensUsed,
    aiRuns
  });
  input.onProgress?.("Completado");

  return {
    markdown,
    filename: resultFile.filename,
    downloadUrl: `/api/download/${encodeURIComponent(resultFile.filename)}`,
    pdfUrl: `/api/pdf/${encodeURIComponent(resultFile.filename)}`,
    metadata: {
      provider,
      model,
      prompt: prompt.name,
      title: video.title,
      videoUrl: video.url,
      channelName: video.channelName,
      durationSeconds: video.durationSeconds,
      durationText: video.durationText,
      transcriptLanguage: video.language,
      transcriptWords,
      outputWords,
      transcriptRef: canonical.transcriptRef,
      transcriptSource: video.source,
      transcriptCached: Boolean(video.cached),
      chunked: prepared.chunked,
      chunks: prepared.chunks,
      chunkingStrategy: prepared.chunkingStrategy,
      chunkSizeChars: prepared.chunkSizeChars,
      chunkOverlapChars: prepared.chunkOverlapChars,
      modelContextTokensUsed: prepared.modelContextTokensUsed,
      usageTotals
    }
  };
}

export type ProcessVideoResult = Awaited<ReturnType<typeof processVideo>>;
