import { getDb, buildRoutineExerciseInsertRows } from "@/lib/db";
import { routines, routineExercises, exercises } from "@/drizzle/schema";
import { eq, asc, inArray } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const allRoutines = await db.select().from(routines).orderBy(asc(routines.name));
  if (allRoutines.length === 0) return Response.json([]);

  const routineIds = allRoutines.map((r) => r.id);
  const reRows = await db
    .select({
      re: routineExercises,
      exercise: exercises,
    })
    .from(routineExercises)
    .leftJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
    .where(inArray(routineExercises.routineId, routineIds))
    .orderBy(asc(routineExercises.sortOrder));

  const reByRoutineId: Record<number, typeof reRows> = {};
  for (const row of reRows) {
    if (!reByRoutineId[row.re.routineId]) reByRoutineId[row.re.routineId] = [];
    reByRoutineId[row.re.routineId].push(row);
  }

  const result = allRoutines.map((r) => ({
    ...r,
    exercises: (reByRoutineId[r.id] ?? []).map((row) => ({
      id: row.re.id,
      sortOrder: row.re.sortOrder,
      exercise: row.exercise,
    })),
  }));

  return Response.json(result);
}

export async function POST(request: Request) {
  const db = getDb();
  const { name, exerciseIds } = await request.json();
  if (!name || !exerciseIds?.length) {
    return Response.json({ error: "Name and exerciseIds required" }, { status: 400 });
  }

  const [routine] = await db.insert(routines).values({ name }).returning();

  await db.insert(routineExercises).values(
    buildRoutineExerciseInsertRows(routine.id, exerciseIds)
  );

  return Response.json(routine, { status: 201 });
}
