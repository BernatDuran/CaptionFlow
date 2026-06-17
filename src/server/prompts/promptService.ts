import fs from "node:fs/promises";
import path from "node:path";
import { AppError, type DiagramPromptDefinition, type PromptDefinition } from "../types";
import { getRootDir } from "../config/configService";

const PROMPTS_DIR = path.join(getRootDir(), "prompts");
const DIAGRAM_PROMPTS_DIR = path.join(PROMPTS_DIR, "diagrams");

function parseScalar(value: string) {
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && trimmed !== "") {
    return numeric;
  }

  return trimmed;
}

export function parseFrontmatter(markdown: string) {
  if (!markdown.startsWith("---")) {
    return { data: {}, content: markdown.trim() };
  }

  const end = markdown.indexOf("\n---", 3);
  if (end === -1) {
    return { data: {}, content: markdown.trim() };
  }

  const frontmatter = markdown.slice(3, end).trim();
  const content = markdown.slice(end + 4).trim();
  const data: Record<string, string | number> = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (match) {
      data[match[1]] = parseScalar(match[2]);
    }
  }

  return { data, content };
}

function toPromptDefinition(filename: string, raw: string): PromptDefinition {
  const { data, content } = parseFrontmatter(raw);
  const id = filename.replace(/\.md$/i, "");
  const fallbackName = id.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  return {
    id,
    filename,
    name: String(data.name || fallbackName),
    description: String(data.description || ""),
    outputFilenamePrefix: String(data.output_filename_prefix || id),
    temperature: typeof data.temperature === "number" ? data.temperature : 0.3,
    content
  };
}

function toDiagramPromptDefinition(filename: string, raw: string): DiagramPromptDefinition {
  const prompt = toPromptDefinition(filename, raw);
  const { data } = parseFrontmatter(raw);

  return {
    ...prompt,
    diagramType: String(data.diagram_type || "flowchart TD")
  };
}

async function listPromptsFromDir<T>(dir: string, mapper: (filename: string, raw: string) => T) {
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const markdownFiles = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"));

  const prompts = await Promise.all(
    markdownFiles.map(async (entry) => {
      const raw = await fs.readFile(path.join(dir, entry.name), "utf8");
      return mapper(entry.name, raw);
    })
  );

  return prompts;
}

export async function listPrompts() {
  const prompts = await listPromptsFromDir(PROMPTS_DIR, toPromptDefinition);
  return prompts.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function getPromptById(id: string) {
  const prompts = await listPrompts();

  if (prompts.length === 0) {
    throw new AppError("NO_PROMPTS", "No hay prompts disponibles en la carpeta /prompts.", 400);
  }

  const prompt = prompts.find((item) => item.id === id);
  if (!prompt) {
    throw new AppError("PROMPT_NOT_FOUND", "No se ha encontrado el prompt seleccionado.", 404);
  }
  return prompt;
}

export async function savePrompt(definition: Omit<PromptDefinition, "filename"> & { id: string }) {
  const safeId = definition.id.replace(/[^a-zA-Z0-9-_]/g, "");
  if (!safeId) throw new AppError("VALIDATION_ERROR", "ID de prompt invalido.", 400);

  const filename = `${safeId}.md`;
  const fullPath = path.join(PROMPTS_DIR, filename);

  const lines = ["---"];
  if (definition.name) lines.push(`name: "${definition.name.replace(/"/g, '\\"')}"`);
  if (definition.description) lines.push(`description: "${definition.description.replace(/"/g, '\\"')}"`);
  if (definition.outputFilenamePrefix) lines.push(`output_filename_prefix: "${definition.outputFilenamePrefix.replace(/"/g, '\\"')}"`);
  if (typeof definition.temperature === "number") lines.push(`temperature: ${definition.temperature}`);
  lines.push("---");
  lines.push("");
  lines.push(definition.content || "");

  const raw = lines.join("\n");
  await fs.mkdir(PROMPTS_DIR, { recursive: true });
  await fs.writeFile(fullPath, raw, "utf8");
  return toPromptDefinition(filename, raw);
}

export async function deletePrompt(id: string) {
  const safeId = id.replace(/[^a-zA-Z0-9-_]/g, "");
  if (!safeId) return;
  const filename = `${safeId}.md`;
  const fullPath = path.join(PROMPTS_DIR, filename);
  try {
    await fs.unlink(fullPath);
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
  }
}

export async function listDiagramPrompts() {
  const prompts = await listPromptsFromDir(DIAGRAM_PROMPTS_DIR, toDiagramPromptDefinition);
  return prompts.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function getDiagramPromptById(id = "flowchart") {
  const prompts = await listDiagramPrompts();

  if (prompts.length === 0) {
    throw new AppError("NO_PROMPTS", "No hay prompts de diagrama disponibles en /prompts/diagrams.", 400);
  }

  return prompts.find((prompt) => prompt.id === id) || prompts[0];
}
