export function computeE1rm(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}
