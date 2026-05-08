import { getDb, buildSetInsertRows } from "@/lib/db";
import { workouts, workoutExercises, sets } from "@/drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { getWorkoutById } from "../route";
import { validateUpdateWorkoutBody } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workout = await getWorkoutById(parseInt(id));
  if (!workout) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(workout);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();
  const { date, routineId, notes, exercises: exerciseData } = body;

  const bodyErr = validateUpdateWorkoutBody(body);
  if (bodyErr) {
    return Response.json({ error: bodyErr }, { status: 400 });
  }

  const numericId = parseInt(id);
  const [existing] = await db.select().from(workouts).where(eq(workouts.id, numericId));
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx.update(workouts).set({ date: date ?? existing.date, routineId: routineId ?? null, notes: notes ?? null }).where(eq(workouts.id, numericId));

    const existingWe = await tx.select().from(workoutExercises).where(eq(workoutExercises.workoutId, numericId));
    if (existingWe.length > 0) {
      await tx.delete(sets).where(inArray(sets.workoutExerciseId, existingWe.map((w) => w.id)));
      await tx.delete(workoutExercises).where(eq(workoutExercises.workoutId, numericId));
    }
  });

  // Re-insert exercises and sets (same pattern as POST)
  await db.transaction(async (tx) => {
    for (let i = 0; i < exerciseData.length; i++) {
      const ex = exerciseData[i];
      const [we] = await tx.insert(workoutExercises).values({
        workoutId: numericId,
        exerciseId: ex.exerciseId,
        sortOrder: i + 1,
      }).returning();

      if (ex.sets?.length) {
        await tx.insert(sets).values(buildSetInsertRows(we.id, ex.sets));
      }
    }
  });

  const full = await getWorkoutById(numericId);
  return Response.json(full);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  await db.delete(workouts).where(eq(workouts.id, parseInt(id)));
  return Response.json({ success: true });
}
