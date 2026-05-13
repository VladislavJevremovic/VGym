import { getDb, groupSetsByWorkoutExerciseId } from "@/lib/db";
import { workoutExercises, sets, workouts, exercises } from "@/drizzle/schema";
import { eq, asc, inArray, gte, and } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { computeE1rm } from "@/lib/stats";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const db = getDb();
  const { exerciseId } = await params;
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "90");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = formatDate(cutoff);

  const exId = parseInt(exerciseId, 10);
  if (isNaN(exId) || exId < 1) return Response.json([]);

  const [ex] = await db.select({ category: exercises.category }).from(exercises).where(eq(exercises.id, exId));
  if (!ex || ex.category === "cardio") return Response.json([]);

  // Filter by date in SQL — no JS post-filtering needed
  const weList = await db
    .select({ weId: workoutExercises.id, workoutDate: workouts.date })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workoutExercises.exerciseId, exId), gte(workouts.date, cutoffStr)))
    .orderBy(asc(workouts.date));

  if (weList.length === 0) return Response.json([]);

  const weIds = weList.map((w) => w.weId);
  const allSetRows = await db
    .select()
    .from(sets)
    .where(inArray(sets.workoutExerciseId, weIds))
    .orderBy(asc(sets.setNumber));

  const setsByWeId = groupSetsByWorkoutExerciseId(allSetRows);

  const dataPoints = weList.map(({ weId, workoutDate }) => {
    const setList = setsByWeId[weId] ?? [];
    const reps = setList.reduce((sum, s) => sum + s.reps, 0);
    const volume = setList.reduce((sum, s) => sum + s.reps * (s.weightKg || 0), 0);
    const maxWeight = setList.reduce((max, s) => Math.max(max, s.weightKg || 0), 0);
    const maxReps = setList.reduce((max, s) => Math.max(max, s.reps), 0);
    const setCount = setList.length;
    const topWeightSet = setList.find((s) => s.weightKg === maxWeight);
    const topReps = topWeightSet?.reps || 0;
    const e1rm = maxWeight && topReps ? computeE1rm(maxWeight, topReps) : 0;
    return {
      date: workoutDate,
      reps,
      volume: Math.round(volume * 10) / 10,
      maxWeight,
      maxReps,
      setCount,
      e1rm: Math.round(e1rm * 10) / 10,
    };
  });

  return Response.json(dataPoints);
}
