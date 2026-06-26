import type { ProviderId } from "../api/types";

export function formatModelDisplayId(id: string, provider?: ProviderId | string) {
  if (provider === "nanogpt" && id.includes("/")) {
    return id.slice(id.indexOf("/") + 1).toLowerCase();
  }

  return id.toLowerCase();
}

export function formatModelShort(model?: string) {
  if (!model) return "";
  const parts = model.split("/");
  return parts[parts.length - 1];
}

export function formatDateShort(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  }).format(new Date(value));
}

export function formatDurationMs(ms?: number) {
  if (!ms) return "";
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds >= 10 ? 0 : 1)} s`;
  return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
}

export function formatDurationClock(ms?: number) {
  if (!ms) return "";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const minuteText = minutes < 100 ? String(minutes).padStart(2, "0") : String(minutes);
  return `${minuteText}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatTokens(value?: number | null, suffix = "tok") {
  if (!value) return "";
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k ${suffix}`;
  return `${value} ${suffix}`;
}

export function formatTokenLimitSummary(tokens?: number | null) {
  if (!tokens) return "[limite desconocido]";
  return `[${Math.round(tokens / 1000)}k tok]`;
}

export function formatPlainThousands(value: number | string) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatWords(value?: number, suffix = "pal.") {
  if (!value) return "";
  return `${formatPlainThousands(value)} ${suffix}`;
}

export function formatVideoDuration(input: { durationSeconds?: number; durationText?: string }) {
  if (typeof input.durationSeconds === "number") {
    const minutes = Math.floor(input.durationSeconds / 60);
    const seconds = Math.round(input.durationSeconds % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  return input.durationText || "";
}

export function getMonthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(value: string) {
  if (!value) return "Todos los meses";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es", { month: "short", year: "2-digit" })
    .format(new Date(year, month - 1, 1))
    .replace(".", "");
}

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
