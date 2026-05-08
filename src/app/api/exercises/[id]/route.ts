import { getDb } from "@/lib/db";
import { exercises, workoutExercises, routineExercises } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { validateExerciseBody } from "@/lib/validation";
import { LibsqlError } from "@libsql/client";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const numericId = parseInt(id);
  if (!numericId || numericId < 1) return Response.json({ error: "Invalid ID" }, { status: 400 });

  const [existing] = await db.select().from(exercises).where(eq(exercises.id, numericId));
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const bodyErr = validateExerciseBody(body);
  if (bodyErr) return Response.json({ error: bodyErr }, { status: 400 });

  try {
    const [updated] = await db.update(exercises)
      .set({
        name: body.name?.trim() ?? existing.name,
        muscleGroup: body.muscleGroup ?? existing.muscleGroup,
        category: body.category ?? existing.category,
      })
      .where(eq(exercises.id, numericId))
      .returning();
    return Response.json(updated);
  } catch (e: unknown) {
    if (e instanceof LibsqlError && e.message?.includes("UNIQUE")) {
      return Response.json({ error: "Exercise name already exists" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const numericId = parseInt(id);
  if (!numericId || numericId < 1) return Response.json({ error: "Invalid ID" }, { status: 400 });

  const [existing] = await db.select().from(exercises).where(eq(exercises.id, numericId));
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const refWorkouts = await db.select({ id: workoutExercises.id }).from(workoutExercises)
    .where(eq(workoutExercises.exerciseId, numericId)).limit(1);
  const refRoutines = await db.select({ id: routineExercises.id }).from(routineExercises)
    .where(eq(routineExercises.exerciseId, numericId)).limit(1);

  const refCount = refWorkouts.length + refRoutines.length;
  if (refCount > 0) {
    return Response.json(
      { error: `Exercise is used in ${refCount} routine(s) or workout(s). Delete them first.` },
      { status: 409 }
    );
  }

  await db.delete(exercises).where(eq(exercises.id, numericId));
  return Response.json({ success: true });
}
