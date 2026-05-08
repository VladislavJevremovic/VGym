import { getDb } from "@/lib/db";
import { workouts, workoutExercises, sets, exercises } from "@/drizzle/schema";
import { eq, gte, inArray, and, asc, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "90");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = formatDate(cutoff);

  const allExercises = await db
    .select()
    .from(exercises)
    .where(sql`${exercises.category} != 'cardio'`);

  if (allExercises.length === 0) return Response.json([]);

  const result = [];

  for (const ex of allExercises) {
    const weList = await db
      .select({ weId: workoutExercises.id, date: workouts.date })
      .from(workoutExercises)
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(and(eq(workoutExercises.exerciseId, ex.id), gte(workouts.date, cutoffStr)))
      .orderBy(asc(workouts.date));

    if (weList.length === 0) continue;

    const weIds = weList.map((w) => w.weId);
    const allSets = await db
      .select()
      .from(sets)
      .where(inArray(sets.workoutExerciseId, weIds))
      .orderBy(asc(sets.setNumber));

    const setsByWeId: Record<number, typeof allSets> = {};
    for (const s of allSets) {
      if (!setsByWeId[s.workoutExerciseId]) setsByWeId[s.workoutExerciseId] = [];
      setsByWeId[s.workoutExerciseId].push(s);
    }

    let bestE1rm = 0;
    let bestDate = "";

    for (const we of weList) {
      const setList = setsByWeId[we.weId] ?? [];
      for (const s of setList) {
        if (s.weightKg && s.reps) {
          const e1rm = s.weightKg * (1 + s.reps / 30);
          if (e1rm > bestE1rm) {
            bestE1rm = e1rm;
            bestDate = we.date;
          }
        }
      }
    }

    if (bestE1rm > 0) {
      result.push({
        exerciseId: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        e1rm: Math.round(bestE1rm * 10) / 10,
        date: bestDate,
      });
    }
  }

  result.sort((a, b) => b.e1rm - a.e1rm);
  return Response.json(result);
}
