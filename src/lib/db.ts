import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { inArray } from "drizzle-orm";
import * as schema from "@/drizzle/schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!dbInstance) {
    const client = createClient({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

interface SetLike {
  workoutExerciseId: number;
  [key: string]: unknown;
}

export function groupSetsByWorkoutExerciseId<T extends SetLike>(allSets: T[]): Record<number, T[]> {
  const grouped: Record<number, T[]> = {};
  for (const s of allSets) {
    if (!grouped[s.workoutExerciseId]) grouped[s.workoutExerciseId] = [];
    grouped[s.workoutExerciseId].push(s);
  }
  return grouped;
}

interface SetInput {
  reps: number;
  weightKg?: number | null;
  durationSeconds?: number | null;
}

export function buildSetInsertRows(weId: number, setsList: SetInput[]) {
  return setsList.map((s, j) => ({
    workoutExerciseId: weId,
    setNumber: j + 1,
    reps: s.reps,
    weightKg: s.weightKg ?? null,
    durationSeconds: s.durationSeconds ?? null,
  }));
}

export function buildRoutineExerciseInsertRows(routineId: number, exerciseIds: number[]) {
  return exerciseIds.map((exerciseId, i) => ({
    routineId,
    exerciseId,
    sortOrder: i + 1,
  }));
}

export async function verifyExerciseIds(ids: number[]): Promise<number[]> {
  const db = getDb();
  const found = await db.select({ id: schema.exercises.id }).from(schema.exercises).where(inArray(schema.exercises.id, ids));
  const foundSet = new Set(found.map((r) => r.id));
  return ids.filter((id) => !foundSet.has(id));
}
