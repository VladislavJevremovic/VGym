import { getDb } from "@/lib/db";
import { workouts, workoutExercises, sets, exercises } from "@/drizzle/schema";
import { and, eq, gte, ne, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const weeks = Math.max(1, Math.min(parseInt(searchParams.get("weeks") || "8"), 26));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStarts: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const start = new Date(today);
    start.setDate(start.getDate() - (i * 7 + 6));
    weekStarts.push(formatDate(start));
  }

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (weeks * 7 - 1));
  const cutoffStr = formatDate(cutoff);

  const rows = await db
    .select({
      muscleGroup: exercises.muscleGroup,
      date: workouts.date,
      setCount: sql<number>`count(${sets.id})`,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(and(gte(workouts.date, cutoffStr), ne(exercises.muscleGroup, "Cardio")))
    .groupBy(exercises.muscleGroup, workouts.date);

  const todayStr = formatDate(today);
  const todayMs = Date.parse(todayStr + "T00:00:00Z");

  const byMuscle = new Map<string, number[]>();
  for (const r of rows) {
    const rowMs = Date.parse(r.date + "T00:00:00Z");
    const daysAgo = Math.floor((todayMs - rowMs) / 86_400_000);
    if (daysAgo < 0) continue;
    const bucket = Math.floor(daysAgo / 7);
    if (bucket >= weeks) continue;
    let counts = byMuscle.get(r.muscleGroup);
    if (!counts) {
      counts = new Array(weeks).fill(0);
      byMuscle.set(r.muscleGroup, counts);
    }
    counts[bucket] += Number(r.setCount);
  }

  const series = Array.from(byMuscle.entries())
    .map(([muscleGroup, counts]) => ({
      muscleGroup,
      counts,
      total: counts.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);

  return Response.json({ weeks, weekStarts, series });
}
