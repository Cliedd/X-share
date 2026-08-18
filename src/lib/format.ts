import type { DraftStatus } from "@/server/types";

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dayLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });

export function formatDateTime(value: number | null) {
  return value ? dateTime.format(new Date(value)) : "—";
}

export function formatTime(value: number | null) {
  return value ? time.format(new Date(value)) : "—";
}

export function formatDay(value: number) {
  return dayLabel.format(new Date(value));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export const STATUS_LABELS: Record<DraftStatus, string> = {
  draft: "Brouillon",
  approved: "Approuvé",
  scheduled: "Programmé",
  publishing: "En cours",
  published: "Publié",
  failed: "Échec",
};

export const STATUS_TONES: Record<DraftStatus, string> = {
  draft: "border-[var(--line-strong)] bg-ink-800 text-muted",
  approved: "border-aqua-400/30 bg-aqua-400/10 text-aqua-300",
  scheduled: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  publishing: "border-violet-400/30 bg-violet-500/10 text-violet-400",
  published: "border-aqua-400/40 bg-aqua-400/15 text-aqua-300",
  failed: "border-coral-400/30 bg-coral-400/10 text-coral-300",
};

export function statusLabel(status: DraftStatus) {
  return STATUS_LABELS[status] ?? status;
}

export function statusTone(status: DraftStatus) {
  return STATUS_TONES[status] ?? STATUS_TONES.draft;
}

/** Lundi 00:00 de la semaine contenant `reference`. */
export function startOfWeek(reference = Date.now()) {
  const date = new Date(reference);
  const offset = (date.getDay() + 6) % 7; // lundi = 0
  date.setDate(date.getDate() - offset);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
