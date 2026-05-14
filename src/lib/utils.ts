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

export function fmtElapsed(startedAtIso: string, endedAtIso?: string | null): string {
  const start = Date.parse(startedAtIso);
  const end = endedAtIso ? Date.parse(endedAtIso) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "";
  const totalMinutes = Math.floor((end - start) / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function mapSetsForApi(
  sets: { reps: number; weightKg: number | null; durationSeconds: number | null }[]
): { reps: number; weightKg: number | null; durationSeconds: number | null }[] {
  return sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg, durationSeconds: s.durationSeconds }));
}
