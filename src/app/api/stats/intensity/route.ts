import { getDb } from "@/lib/db";
import { workouts, workoutExercises, sets, exercises } from "@/drizzle/schema";
import { eq, gte, inArray, and } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

const BUCKETS = [
  { range: "1-5", label: "Strength", maxReps: 5 },
  { range: "6-8", label: "Strength/Hypertrophy", maxReps: 8 },
  { range: "9-12", label: "Hypertrophy", maxReps: 12 },
  { range: "13+", label: "Endurance", maxReps: Infinity },
];

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "90");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = formatDate(cutoff);

  const weList = await db
    .select({ weId: workoutExercises.id, exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(gte(workouts.date, cutoffStr));

  if (weList.length === 0) {
    return Response.json(BUCKETS.map((b) => ({ range: b.range, label: b.label, count: 0 })));
  }

  const exIds = [...new Set(weList.map((w) => w.exerciseId))];

  const cardioIds = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(inArray(exercises.id, exIds), eq(exercises.category, "cardio")));

  const cardioSet = new Set(cardioIds.map((c) => c.id));

  const nonCardioWeIds = weList
    .filter((w) => !cardioSet.has(w.exerciseId))
    .map((w) => w.weId);

  if (nonCardioWeIds.length === 0) {
    return Response.json(BUCKETS.map((b) => ({ range: b.range, label: b.label, count: 0 })));
  }

  const allSets = await db
    .select({ reps: sets.reps })
    .from(sets)
    .where(and(inArray(sets.workoutExerciseId, nonCardioWeIds)));

  const counts: Record<string, number> = {};
  for (const bucket of BUCKETS) counts[bucket.range] = 0;

  for (const s of allSets) {
    for (const bucket of BUCKETS) {
      if (s.reps <= bucket.maxReps) {
        counts[bucket.range]++;
        break;
      }
    }
  }

  return Response.json(
    BUCKETS.map((b) => ({ range: b.range, label: b.label, count: counts[b.range] }))
  );
}
