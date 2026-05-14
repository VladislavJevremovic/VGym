import type { Exercise, WorkoutSet } from "./types";

const KEY = "vgym:logDraft";

export interface LogDraft {
  startedAt: string;
  notes: string;
  loggedExercises: { exercise: Exercise; sets: WorkoutSet[] }[];
}

export function loadDraft(): LogDraft | null {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LogDraft;
    if (!parsed || typeof parsed.startedAt !== "string" || !Array.isArray(parsed.loggedExercises)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(d: LogDraft): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // Quota exceeded or private mode — ignore.
  }
}

export function clearDraft(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}
