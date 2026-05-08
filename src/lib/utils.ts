export function getLocalDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split("-");
  return `${parts[1]}/${parts[2]}`;
}

export function fmtDuration(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function mapSetsForApi(
  sets: { reps: number; weightKg: number | null; durationSeconds: number | null }[]
): { reps: number; weightKg: number | null; durationSeconds: number | null }[] {
  return sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg, durationSeconds: s.durationSeconds }));
}
