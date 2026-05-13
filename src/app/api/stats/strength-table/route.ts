import { getDb } from "@/lib/db";
import { workouts, workoutExercises, sets, exercises } from "@/drizzle/schema";
import { eq, gte, and, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { computeE1rm } from "@/lib/stats";

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "90");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = formatDate(cutoff);

  const rows = await db
    .select({
      exerciseId: exercises.id,
      name: exercises.name,
      muscleGroup: exercises.muscleGroup,
      date: workouts.date,
      reps: sets.reps,
      weightKg: sets.weightKg,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(and(
      sql`${exercises.category} != 'cardio'`,
      gte(workouts.date, cutoffStr),
    ));

  if (rows.length === 0) return Response.json([]);

  const bestByExercise = new Map<number, { name: string; muscleGroup: string; e1rm: number; date: string }>();

  for (const r of rows) {
    if (!r.weightKg || !r.reps) continue;
    const e1rm = computeE1rm(r.weightKg, r.reps);
    const prev = bestByExercise.get(r.exerciseId);
    if (!prev || e1rm > prev.e1rm) {
      bestByExercise.set(r.exerciseId, {
        name: r.name,
        muscleGroup: r.muscleGroup,
        e1rm,
        date: r.date,
      });
    }
  }

  const result = Array.from(bestByExercise.entries()).map(([exerciseId, v]) => ({
    exerciseId,
    ...v,
    e1rm: Math.round(v.e1rm * 10) / 10,
  }));

  result.sort((a, b) => b.e1rm - a.e1rm);
  return Response.json(result);
}
