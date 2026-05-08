import { getDb } from "@/lib/db";
import { workouts, workoutExercises, sets, exercises } from "@/drizzle/schema";
import { eq, gte, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "90");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = formatDate(cutoff);

  const rows = await db
    .select({
      muscleGroup: exercises.muscleGroup,
      volume: sql<number>`coalesce(sum(${sets.reps} * ${sets.weightKg}), 0)`,
      setCount: sql<number>`count(${sets.id})`,
      exerciseCount: sql<number>`count(distinct ${exercises.id})`,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(gte(workouts.date, cutoffStr))
    .groupBy(exercises.muscleGroup);

  rows.sort((a, b) => b.volume - a.volume);

  return Response.json(
    rows.map((r) => ({
      muscleGroup: r.muscleGroup,
      volume: Math.round(r.volume * 10) / 10,
      setCount: r.setCount,
      exerciseCount: r.exerciseCount,
    }))
  );
}
