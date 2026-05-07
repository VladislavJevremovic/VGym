import { getDb } from "@/lib/db";
import { routines, routineExercises } from "@/drizzle/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const [routine] = await db.select().from(routines).where(eq(routines.id, parseInt(id)));
  if (!routine) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const reRows = await db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routine.id))
    .orderBy(asc(routineExercises.sortOrder));
  return Response.json({ ...routine, exercises: reRows });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const { name, exerciseIds } = await request.json();
  if (!name || !exerciseIds?.length) {
    return Response.json({ error: "Name and exerciseIds required" }, { status: 400 });
  }
  const [existing] = await db.select().from(routines).where(eq(routines.id, parseInt(id)));
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  await db.transaction(async (tx) => {
    await tx.update(routines).set({ name }).where(eq(routines.id, parseInt(id)));
    await tx.delete(routineExercises).where(eq(routineExercises.routineId, parseInt(id)));
    await tx.insert(routineExercises).values(
      exerciseIds.map((exerciseId: number, i: number) => ({
        routineId: parseInt(id),
        exerciseId,
        sortOrder: i + 1,
      }))
    );
  });
  return Response.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  await db.delete(routines).where(eq(routines.id, parseInt(id)));
  return Response.json({ success: true });
}
