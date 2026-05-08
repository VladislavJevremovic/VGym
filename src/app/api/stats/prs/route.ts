import { getDb } from "@/lib/db";
import { workouts, workoutExercises, sets, exercises } from "@/drizzle/schema";
import { eq, inArray, asc, sql } from "drizzle-orm";

export async function GET() {
  const db = getDb();

  const allExercises = await db
    .select()
    .from(exercises)
    .where(sql`${exercises.category} != 'cardio'`);

  if (allExercises.length === 0) return Response.json([]);

  const exIds = allExercises.map((e) => e.id);

  const weRows = await db
    .select({ weId: workoutExercises.id, exerciseId: workoutExercises.exerciseId, date: workouts.date })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(inArray(workoutExercises.exerciseId, exIds))
    .orderBy(asc(workouts.date));

  if (weRows.length === 0) {
    return Response.json(
      allExercises.map((e) => ({
        exerciseId: e.id,
        name: e.name,
        muscleGroup: e.muscleGroup,
        maxWeight: null,
        maxReps: null,
        bestE1rm: null,
        maxVolume: null,
      }))
    );
  }

  const weIds = weRows.map((r) => r.weId);
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

  const setsByExId: Record<number, { date: string; set: typeof allSets[number] }[]> = {};
  for (const we of weRows) {
    const setList = setsByWeId[we.weId] ?? [];
    for (const s of setList) {
      if (!setsByExId[we.exerciseId]) setsByExId[we.exerciseId] = [];
      setsByExId[we.exerciseId].push({ date: we.date, set: s });
    }
  }

  const result = [];

  for (const ex of allExercises) {
    const s = setsByExId[ex.id] ?? [];

    let maxWeight = 0;
    let maxWeightReps = 0;
    let maxWeightDate = "";
    let maxReps = 0;
    let maxRepsWeight = 0;
    let maxRepsDate = "";
    let bestE1rm = 0;
    let bestE1rmDate = "";
    let maxVolume = 0;
    let maxVolumeDate = "";

    for (const { date, set: setItem } of s) {
      const w = setItem.weightKg ?? 0;
      const r = setItem.reps;

      if (w > maxWeight) { maxWeight = w; maxWeightReps = r; maxWeightDate = date; }
      if (r > maxReps) { maxReps = r; maxRepsWeight = w; maxRepsDate = date; }

      const volume = w * r;
      if (volume > maxVolume) { maxVolume = volume; maxVolumeDate = date; }

      if (w > 0 && r > 0) {
        const e1rm = w * (1 + r / 30);
        if (e1rm > bestE1rm) { bestE1rm = e1rm; bestE1rmDate = date; }
      }
    }

    result.push({
      exerciseId: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      maxWeight: maxWeight > 0 ? { value: maxWeight, reps: maxWeightReps, date: maxWeightDate } : null,
      maxReps: maxReps > 0 ? { value: maxReps, weight: maxRepsWeight, date: maxRepsDate } : null,
      bestE1rm: bestE1rm > 0 ? { value: Math.round(bestE1rm * 10) / 10, date: bestE1rmDate } : null,
      maxVolume: maxVolume > 0 ? { value: Math.round(maxVolume * 10) / 10, date: maxVolumeDate } : null,
    });
  }

  return Response.json(result);
}
