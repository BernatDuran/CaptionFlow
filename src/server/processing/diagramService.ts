import { randomUUID } from "node:crypto";
import { generateText } from "../ai/aiClient";
import { assertApiKey, getActiveProviderAndModel } from "../config/configService";
import { appendResultRuns, readResultFile, readResultMetadata, saveDiagram, sanitizeFilename } from "../files/fileService";
import { getDiagramPromptById } from "../prompts/promptService";
import type { GenerateTextResult, OperationRun, ProviderId } from "../types";

function escapeMermaidLabel(label: string) {
  return label.replace(/"/g, "'").trim();
}

function expandMultiSourceEdges(line: string) {
  const match = line.match(/^(\s*)([A-Za-z][\w-]*(?:\s*&\s*[A-Za-z][\w-]*)+)\s*-->\s*([A-Za-z][\w-]*)(.*)$/);
  if (!match) return [line];

  const [, indent, sources, target, suffix] = match;
  return sources.split(/\s*&\s*/).map((source) => `${indent}${source} --> ${target}${suffix}`);
}

function expandMultiTargetEdges(line: string) {
  const match = line.match(/^(\s*)([A-Za-z][\w-]*)(.*?-->\s*)([A-Za-z][\w-]*(?:\s*&\s*[A-Za-z][\w-]*)+)(.*)$/);
  if (!match) return [line];

  const [, indent, source, connector, targets, suffix] = match;
  return targets.split(/\s*&\s*/).map((target) => `${indent}${source}${connector}${target}${suffix}`);
}

function normalizeFlowchart(code: string) {
  const lines = code
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/;+\s*$/g, ""));

  return lines
    .flatMap(expandMultiSourceEdges)
    .flatMap(expandMultiTargetEdges)
    .map((line) =>
      line
        .replace(/\b([A-Za-z][\w-]*)\[([^\]\n"]+)\]/g, (_match, id: string, label: string) => `${id}["${escapeMermaidLabel(label)}"]`)
        .replace(/\b([A-Za-z][\w-]*)\{([^}\n"]+)\}/g, (_match, id: string, label: string) => `${id}{"${escapeMermaidLabel(label)}"}`)
    )
    .join("\n")
    .trim();
}

function normalizeTimeline(code: string) {
  const lines = code
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const output: string[] = ["timeline"];
  let hasSection = false;
  let eventIndex = 1;

  for (const line of lines) {
    if (/^timeline\b/i.test(line)) continue;

    const title = line.match(/^title\s+(.+)$/i);
    if (title) {
      output.push(`  title ${title[1].replace(/[:;]+$/g, "").trim()}`);
      continue;
    }

    const explicitSection = line.match(/^section\s+(.+)$/i);
    if (explicitSection) {
      hasSection = true;
      eventIndex = 1;
      output.push(`  section ${explicitSection[1].replace(/[:;]+$/g, "").trim()}`);
      continue;
    }

    const phase = line.match(/^((?:fase|etapa|paso|inicio|desarrollo|resultado|cierre|final)\b[^:]{0,80})\s*:\s*(.+)$/i);
    if (phase) {
      hasSection = true;
      eventIndex = 2;
      output.push(`  section ${phase[1].trim()}`);
      output.push(`    Hito 1 : ${phase[2].trim()}`);
      continue;
    }

    if (!hasSection) {
      hasSection = true;
      eventIndex = 1;
      output.push("  section Proceso");
    }

    const event = line.replace(/^[-*]\s+/, "").replace(/[:;]+$/g, "").trim();
    if (event) {
      const explicitEvent = event.match(/^([^:]{1,60})\s*:\s*(.+)$/);
      if (explicitEvent) {
        output.push(`    ${explicitEvent[1].trim()} : ${explicitEvent[2].trim()}`);
      } else {
        output.push(`    Hito ${eventIndex} : ${event}`);
      }
      eventIndex += 1;
    }
  }

  if (!output.some((line) => line.trim().startsWith("section "))) {
    output.push("  section Proceso", "    Hito 1 : Ideas principales");
  }

  return output.join("\n").trim();
}

function cleanMermaid(raw: string) {
  const withoutFences = raw
    .replace(/^\s*```mermaid\s*/i, "")
    .replace(/^\s*```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  if (/^(flowchart|graph)\b/i.test(withoutFences)) {
    return normalizeFlowchart(withoutFences);
  }

  if (/^timeline\b/i.test(withoutFences)) {
    return normalizeTimeline(withoutFences);
  }

  const validStart = /^(sequenceDiagram|classDiagram|stateDiagram-v2|erDiagram|journey|mindmap)\b/i;
  if (validStart.test(withoutFences)) return withoutFences;

  return `flowchart TD\n  A["Documento"] --> B["Ideas principales"]\n  B --> C["Conclusiones"]`;
}

function getDiagramKind(code: string, fallback: string) {
  const firstLine = code
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return fallback;
  if (/^(flowchart|graph)\b/i.test(firstLine)) return "flowchart";
  if (/^timeline\b/i.test(firstLine)) return "timeline";
  if (/^mindmap\b/i.test(firstLine)) return "mindmap";
  if (/^sequenceDiagram\b/i.test(firstLine)) return "sequenceDiagram";
  return firstLine.split(/\s+/)[0] || fallback;
}

function createDiagramRun(input: {
  provider: ProviderId;
  model: string;
  promptId: string | null;
  diagramPromptId: string;
  diagramType: string;
  result: GenerateTextResult;
}): OperationRun {
  return {
    runId: randomUUID(),
    operation: "diagram_generation",
    scope: "diagram",
    provider: input.provider,
    model: input.model,
    promptId: input.promptId,
    diagramPromptId: input.diagramPromptId,
    diagramType: input.diagramType,
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

export async function generateDiagramFromResult(filename: string, promptId = "flowchart") {
  const markdown = await readResultFile(filename);
  const resultMetadata = await readResultMetadata(filename);
  const diagramPrompt = await getDiagramPromptById(promptId);
  const { provider, model } = await getActiveProviderAndModel();
  assertApiKey(provider);

  const mermaid = await generateText({
    provider,
    model,
    temperature: diagramPrompt.temperature,
    prompt: `${diagramPrompt.content}

Documento:

${markdown.slice(0, 45000)}`
  });

  const cleaned = cleanMermaid(mermaid.text);
  const diagramType = getDiagramKind(cleaned, diagramPrompt.diagramType);
  const diagramFile = await saveDiagram(`${sanitizeFilename(filename.replace(/\.md$/i, ""))}-diagram-${sanitizeFilename(promptId)}`, cleaned);
  const diagramRun = createDiagramRun({
    provider,
    model,
    promptId: resultMetadata.promptId || null,
    diagramPromptId: diagramPrompt.id,
    diagramType,
    result: mermaid
  });
  const metadata = await appendResultRuns(filename, [diagramRun]);

  return {
    mermaid: cleaned,
    filename: diagramFile.filename,
    run: diagramRun,
    usageTotals: metadata.usageTotals
  };
}
