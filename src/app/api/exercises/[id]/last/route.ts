import { getDb } from "@/lib/db";
import { workoutExercises, sets, workouts } from "@/drizzle/schema";
import { eq, desc, asc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const exId = parseInt(id);
  if (!exId || exId < 1) return Response.json(null);

  const db = getDb();

  const [lastWe] = await db
    .select({ weId: workoutExercises.id, workoutDate: workouts.date })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(eq(workoutExercises.exerciseId, exId))
    .orderBy(desc(workouts.date), desc(workoutExercises.id))
    .limit(1);

  if (!lastWe) return Response.json(null);

  const setList = await db
    .select()
    .from(sets)
    .where(eq(sets.workoutExerciseId, lastWe.weId))
    .orderBy(asc(sets.setNumber));

  return Response.json({
    date: lastWe.workoutDate,
    sets: setList.map((s) => ({ reps: s.reps, weightKg: s.weightKg, durationSeconds: s.durationSeconds })),
  });
}
