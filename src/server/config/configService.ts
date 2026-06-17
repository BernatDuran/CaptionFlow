import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { MODEL_CATALOG } from "./modelCatalog";
import { AppError, type LocalSettings, type ProviderId } from "../types";

dotenv.config();

const ROOT_DIR = process.cwd();
const CONFIG_DIR = path.join(ROOT_DIR, "config");
const SETTINGS_PATH = path.join(CONFIG_DIR, "local.settings.json");

const providerKeys: Record<ProviderId, string[]> = {
  openai: ["OPENAI_API_KEY"],
  google: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
  nanogpt: ["NANOGPT_API_KEY", "NANO_GPT_API_KEY"]
};

const isProvider = (value: string | undefined): value is ProviderId =>
  value === "openai" || value === "google" || value === "nanogpt";

function normalizeOutputRootDir(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? path.resolve(trimmed) : undefined;
}

export function getRootDir() {
  return ROOT_DIR;
}

export function reloadEnvironment() {
  const result = dotenv.config({
    path: path.join(ROOT_DIR, ".env"),
    override: true
  });

  if (result.error) {
    throw new AppError("VALIDATION_ERROR", "No se pudo recargar el archivo .env.", 500);
  }
}

export function getConfiguredProvider(): ProviderId {
  const provider = process.env.ACTIVE_PROVIDER?.toLowerCase();
  return isProvider(provider) ? provider : "openai";
}

export function getApiKey(provider: ProviderId): string | undefined {
  for (const keyName of providerKeys[provider]) {
    const value = process.env[keyName];
    if (value) return value;
  }

  return undefined;
}

export function assertApiKey(provider: ProviderId) {
  if (!getApiKey(provider)) {
    throw new AppError(
      "API_KEY_MISSING",
      `Falta la API key para ${provider}. Revisa ${providerKeys[provider].join(" o ")} en el archivo .env.`,
      400
    );
  }
}

export function getMaxTranscriptChars() {
  return Number(process.env.MAX_TRANSCRIPT_CHARS ?? 60000);
}

export function getModelContextTokens(provider: ProviderId, modelId: string, modelContextTokens?: number | null) {
  if (modelContextTokens) return modelContextTokens;
  const model = MODEL_CATALOG[provider]?.find((m) => m.id === modelId);
  return model?.contextTokens ?? null;
}

export function getDynamicMaxTranscriptChars(provider: ProviderId, modelId: string, modelContextTokens?: number | null) {
  const contextTokens = getModelContextTokens(provider, modelId, modelContextTokens);
  if (contextTokens) {
    const contextChars = contextTokens * 4;
    return Math.floor(contextChars * 0.85); // 15% safety margin
  }
  return getMaxTranscriptChars();
}

export function getChunkSizeChars() {
  return Number(process.env.CHUNK_SIZE_CHARS ?? 22000);
}

export function getAdaptiveChunkSizeChars(settings: LocalSettings, provider: ProviderId, modelId: string, modelContextTokens?: number | null) {
  if (!settings.adaptiveChunkingEnabled) return getChunkSizeChars();

  const contextTokens = getModelContextTokens(provider, modelId, modelContextTokens);
  const safeModelTokens = contextTokens ? Math.floor(contextTokens * 0.85) : 32000;
  const reservedTokens = Math.min(4000, Math.max(1000, Math.floor(safeModelTokens * 0.25)));
  const usableTokens = Math.max(1500, safeModelTokens - reservedTokens);
  const chunkChars = usableTokens * 4;

  return Math.max(6000, Math.min(chunkChars, 80000));
}

let cachedSettings: LocalSettings | null = null;

export function getCachedSettings(): LocalSettings {
  if (cachedSettings) return cachedSettings;

  const activeProvider = getConfiguredProvider();
  const defaults: LocalSettings = {
    activeProvider,
    selectedModels: {
      openai: MODEL_CATALOG.openai[0]?.id,
      google: MODEL_CATALOG.google[0]?.id,
      nanogpt: MODEL_CATALOG.nanogpt[0]?.id
    },
    adaptiveChunkingEnabled: true,
    minimumModelContextTokens: 4000
  };

  try {
    if (fsSync.existsSync(SETTINGS_PATH)) {
      const raw = fsSync.readFileSync(SETTINGS_PATH, "utf8");
      const parsed = JSON.parse(raw) as Partial<LocalSettings>;
      const selectedModels = { ...defaults.selectedModels, ...parsed.selectedModels };

      cachedSettings = {
        activeProvider: parsed.activeProvider && isProvider(parsed.activeProvider) ? parsed.activeProvider : activeProvider,
        selectedModels,
        adaptiveChunkingEnabled: parsed.adaptiveChunkingEnabled ?? defaults.adaptiveChunkingEnabled,
        minimumModelContextTokens: parsed.minimumModelContextTokens ?? defaults.minimumModelContextTokens,
        outputRootDir: normalizeOutputRootDir(parsed.outputRootDir)
      };
      return cachedSettings;
    }
  } catch (err) {
    // Silently fall back to defaults
  }

  cachedSettings = defaults;
  return defaults;
}

export async function readLocalSettings(): Promise<LocalSettings> {
  const activeProvider = getConfiguredProvider();
  const defaults: LocalSettings = {
    activeProvider,
    selectedModels: {
      openai: MODEL_CATALOG.openai[0]?.id,
      google: MODEL_CATALOG.google[0]?.id,
      nanogpt: MODEL_CATALOG.nanogpt[0]?.id
    },
    adaptiveChunkingEnabled: true,
    minimumModelContextTokens: 4000
  };

  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalSettings>;
    const selectedModels = { ...defaults.selectedModels, ...parsed.selectedModels };

    const settings: LocalSettings = {
      activeProvider: parsed.activeProvider && isProvider(parsed.activeProvider) ? parsed.activeProvider : activeProvider,
      selectedModels,
      adaptiveChunkingEnabled: parsed.adaptiveChunkingEnabled ?? defaults.adaptiveChunkingEnabled,
      minimumModelContextTokens: parsed.minimumModelContextTokens ?? defaults.minimumModelContextTokens,
      outputRootDir: normalizeOutputRootDir(parsed.outputRootDir)
    };
    cachedSettings = settings;
    return settings;
  } catch {
    cachedSettings = defaults;
    return defaults;
  }
}

export async function writeLocalSettings(settings: LocalSettings) {
  if (!isProvider(settings.activeProvider)) {
    throw new AppError("PROVIDER_NOT_CONFIGURED", "Proveedor no válido.", 400);
  }

  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const safeSettings: LocalSettings = {
    activeProvider: settings.activeProvider,
    selectedModels: settings.selectedModels,
    adaptiveChunkingEnabled: settings.adaptiveChunkingEnabled ?? false,
    minimumModelContextTokens: settings.minimumModelContextTokens ?? 4000,
    outputRootDir: normalizeOutputRootDir(settings.outputRootDir)
  };

  await fs.writeFile(SETTINGS_PATH, `${JSON.stringify(safeSettings, null, 2)}\n`, "utf8");
  cachedSettings = safeSettings;
  return safeSettings;
}

export async function getActiveProviderAndModel() {
  const settings = await readLocalSettings();
  const provider = settings.activeProvider;
  const model = settings.selectedModels[provider];

  if (!provider) {
    throw new AppError("PROVIDER_NOT_CONFIGURED", "No hay proveedor de IA configurado.", 400);
  }

  if (!model) {
    throw new AppError("MODEL_MISSING", "Selecciona un modelo para el proveedor activo.", 400);
  }

  return { provider, model };
}
