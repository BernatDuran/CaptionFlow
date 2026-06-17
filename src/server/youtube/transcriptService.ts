import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { AppError, type OperationRun, type RunOperation, type VideoTranscript } from "../types";
import { getRootDir } from "../config/configService";

const youtubeUrlPattern =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)[A-Za-z0-9_-]{6,}/;

type YtDlpInfo = {
  id?: string;
  title?: string;
  webpage_url?: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  duration_string?: string;
  upload_date?: string;
  subtitles?: Record<string, unknown[]>;
  automatic_captions?: Record<string, unknown[]>;
};

type TranscriptCacheFile = {
  cachedAt: string;
  video: VideoTranscript;
};

const TRANSCRIPT_CACHE_DIR = path.join(getRootDir(), "output", "transcripts", "cache");

async function getYtDlpExecutable() {
  const localBinary = path.join(getRootDir(), "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");

  try {
    await fs.access(localBinary);
    return localBinary;
  } catch {
    return "yt-dlp";
  }
}

async function runYtDlp(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string }> {
  const executable = await getYtDlpExecutable();

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      shell: false,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(new AppError("YTDLP_NOT_INSTALLED", "yt-dlp no está instalado o no está disponible en el PATH.", 500));
        return;
      }

      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new AppError("VIDEO_NOT_ACCESSIBLE", "No se pudo acceder al vídeo o descargar sus subtítulos.", 400));
    });
  });
}

async function timedYtDlpRun<T>(operation: RunOperation, callback: () => Promise<T>): Promise<{ value: T; run: OperationRun }> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const value = await callback();
  const finishedAt = new Date().toISOString();

  return {
    value,
    run: {
      runId: randomUUID(),
      operation,
      scope: "transcript",
      provider: null,
      model: null,
      promptId: null,
      diagramPromptId: null,
      diagramType: null,
      startedAt,
      finishedAt,
      durationMs: Math.max(0, Date.now() - startMs),
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      usageSource: "provider_reported"
    }
  };
}

export function getYoutubeVideoId(rawUrl: string) {
  const value = rawUrl.trim();

  try {
    const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0];
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v") || undefined;
      }

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" && parts[1]) {
        return parts[1];
      }
    }
  } catch {
    const match = value.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{6,})/);
    return match?.[1];
  }

  return undefined;
}

function getCachePath(videoId: string) {
  return path.join(TRANSCRIPT_CACHE_DIR, `${videoId}.json`);
}

async function readTranscriptCache(videoId: string): Promise<VideoTranscript | undefined> {
  try {
    const raw = await fs.readFile(getCachePath(videoId), "utf8");
    const cached = JSON.parse(raw) as TranscriptCacheFile;
    if (!cached.video?.transcript) return undefined;
    return { ...cached.video, cached: true };
  } catch {
    return undefined;
  }
}

async function writeTranscriptCache(videoId: string, video: VideoTranscript) {
  await fs.mkdir(TRANSCRIPT_CACHE_DIR, { recursive: true });
  const payload: TranscriptCacheFile = {
    cachedAt: new Date().toISOString(),
    video: { ...video, cached: false }
  };
  await fs.writeFile(getCachePath(videoId), JSON.stringify(payload, null, 2), "utf8");
}

function pickOriginalLanguages(captions?: Record<string, unknown[]>) {
  if (!captions) return [];
  const languages = Object.keys(captions);
  const originalLanguages = languages.filter((lang) => lang.endsWith("-orig"));
  return [...originalLanguages, ...languages.filter((lang) => !originalLanguages.includes(lang))];
}

async function readCaptionFile(dir: string) {
  const files = await fs.readdir(dir);
  const captionFile = files.find((file) => /\.(vtt|srt|ttml|srv\d?)$/i.test(file));
  if (!captionFile) return undefined;
  return fs.readFile(path.join(dir, captionFile), "utf8");
}

function stripCaptions(raw: string) {
  const seen = new Set<string>();
  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^(WEBVTT|Kind:|Language:|\d+)$/.test(line)) return false;
      if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(line)) return false;
      if (line.startsWith("<")) return false;
      return true;
    })
    .map((line) => line.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    });

  return lines.join("\n");
}

function mapVideoMetadata(info: YtDlpInfo, cleanUrl: string, videoId?: string) {
  return {
    videoId: info.id || videoId,
    title: info.title,
    url: info.webpage_url || cleanUrl,
    channelName: info.channel || info.uploader,
    durationSeconds: typeof info.duration === "number" ? info.duration : undefined,
    durationText: info.duration_string,
    uploadDate: info.upload_date
  };
}

async function fetchInfo(url: string): Promise<YtDlpInfo> {
  const { stdout } = await runYtDlp(["--dump-json", "--skip-download", url]);
  try {
    return JSON.parse(stdout) as YtDlpInfo;
  } catch {
    throw new AppError("VIDEO_NOT_ACCESSIBLE", "No se pudo leer la información del vídeo.", 400);
  }
}

async function downloadCaptions(url: string, language: string, automatic: boolean) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "captionflow-"));
  const args = [
    "--skip-download",
    "--write-sub",
    "--sub-langs",
    language,
    "--sub-format",
    "vtt/srt/best",
    "-o",
    "%(id)s.%(ext)s",
    url
  ];

  if (automatic) {
    args.splice(2, 0, "--write-auto-sub");
  }

  await runYtDlp(args, tempDir);
  const caption = await readCaptionFile(tempDir);
  await fs.rm(tempDir, { recursive: true, force: true });
  return caption;
}

export function assertValidYoutubeUrl(url: string) {
  if (!youtubeUrlPattern.test(url.trim())) {
    throw new AppError("INVALID_YOUTUBE_URL", "Pega una URL válida de YouTube.", 400);
  }
}

export async function getYoutubeTranscript(url: string): Promise<VideoTranscript> {
  const cleanUrl = url.trim();
  assertValidYoutubeUrl(cleanUrl);
  const videoId = getYoutubeVideoId(cleanUrl);
  let cachedTranscript: VideoTranscript | undefined;
  const runs: OperationRun[] = [];

  if (videoId) {
    cachedTranscript = await readTranscriptCache(videoId);
    if (cachedTranscript?.channelName && cachedTranscript.durationSeconds) return cachedTranscript;
  }

  const infoResult = await timedYtDlpRun("yt_dlp_info", () => fetchInfo(cleanUrl));
  const info = infoResult.value;
  runs.push(infoResult.run);
  if (cachedTranscript) {
    const video = {
      ...cachedTranscript,
      ...mapVideoMetadata(info, cleanUrl, videoId),
      transcript: cachedTranscript.transcript,
      language: cachedTranscript.language,
      source: cachedTranscript.source,
      cached: true,
      runs
    } satisfies VideoTranscript;
    if (videoId) await writeTranscriptCache(videoId, video);
    return video;
  }

  const officialLanguages = pickOriginalLanguages(info.subtitles);

  for (const officialLang of officialLanguages) {
    try {
      const captionResult = await timedYtDlpRun("yt_dlp_captions", () => downloadCaptions(cleanUrl, officialLang, false));
      const raw = captionResult.value;
      const transcript = raw ? stripCaptions(raw) : "";
      if (transcript) {
        runs.push(captionResult.run);
        const video = {
          ...mapVideoMetadata(info, cleanUrl, videoId),
          transcript,
          language: officialLang,
          source: "official",
          runs
        } satisfies VideoTranscript;
        if (videoId) await writeTranscriptCache(videoId, video);
        return video;
      }
    } catch {
      continue;
    }
  }

  const automaticLanguages = pickOriginalLanguages(info.automatic_captions);
  for (const automaticLang of automaticLanguages) {
    try {
      const captionResult = await timedYtDlpRun("yt_dlp_captions", () => downloadCaptions(cleanUrl, automaticLang, true));
      const raw = captionResult.value;
      const transcript = raw ? stripCaptions(raw) : "";
      if (transcript) {
        runs.push(captionResult.run);
        const video = {
          ...mapVideoMetadata(info, cleanUrl, videoId),
          transcript,
          language: automaticLang,
          source: "automatic",
          runs
        } satisfies VideoTranscript;
        if (videoId) await writeTranscriptCache(videoId, video);
        return video;
      }
    } catch {
      continue;
    }
  }

  throw new AppError("NO_TRANSCRIPT", "El vídeo no tiene transcripción o subtítulos disponibles.", 400);
}
