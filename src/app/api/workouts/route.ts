import { getDb } from "@/lib/db";
import { workouts, workoutExercises, sets, exercises } from "@/drizzle/schema";
import { eq, desc, asc, inArray, lt } from "drizzle-orm";

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  if (searchParams.get("full") === "true") {
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const beforeId = searchParams.get("beforeId");

    const allWorkouts = await db
      .select()
      .from(workouts)
      .orderBy(desc(workouts.id))
      .where(beforeId ? lt(workouts.id, parseInt(beforeId)) : undefined)
      .limit(limit);

    if (allWorkouts.length === 0) return Response.json([]);

    const workoutIds = allWorkouts.map((w) => w.id);

    const weRows = await db
      .select({ we: workoutExercises, exercise: exercises })
      .from(workoutExercises)
      .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
      .where(inArray(workoutExercises.workoutId, workoutIds))
      .orderBy(asc(workoutExercises.sortOrder));

    const weIds = weRows.map((r) => r.we.id);
    const allSets = weIds.length > 0
      ? await db.select().from(sets).where(inArray(sets.workoutExerciseId, weIds)).orderBy(asc(sets.setNumber))
      : [];

    const setsByWeId: Record<number, typeof allSets> = {};
    for (const s of allSets) {
      if (!setsByWeId[s.workoutExerciseId]) setsByWeId[s.workoutExerciseId] = [];
      setsByWeId[s.workoutExerciseId].push(s);
    }

    const weByWorkoutId: Record<number, typeof weRows> = {};
    for (const r of weRows) {
      if (!weByWorkoutId[r.we.workoutId]) weByWorkoutId[r.we.workoutId] = [];
      weByWorkoutId[r.we.workoutId].push(r);
    }

    const full = allWorkouts.map((w) => ({
      ...w,
      workoutExercises: (weByWorkoutId[w.id] ?? []).map((r) => ({
        ...r.we,
        exercise: r.exercise,
        sets: setsByWeId[r.we.id] ?? [],
      })),
    }));

    return Response.json(full);
  }

  const all = await db.select().from(workouts).orderBy(desc(workouts.date));
  return Response.json(all);
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { date, routineId, notes, exercises: exerciseData } = body;

  if (!date || !exerciseData?.length) {
    return Response.json({ error: "date and exercises required" }, { status: 400 });
  }

  for (const ex of exerciseData) {
    if (!Number.isInteger(ex.exerciseId) || ex.exerciseId < 1) {
      return Response.json({ error: "Invalid exercise ID" }, { status: 400 });
    }
    for (const s of ex.sets ?? []) {
      if (!Number.isInteger(s.reps) || s.reps < 1) {
        return Response.json({ error: "Reps must be a positive integer" }, { status: 400 });
      }
      if (s.weightKg !== null && s.weightKg !== undefined) {
        if (typeof s.weightKg !== "number" || s.weightKg < 0) {
          return Response.json({ error: "Weight must be a non-negative number" }, { status: 400 });
        }
      }
    }
  }

  const workoutId = await db.transaction(async (tx) => {
    const [workout] = await tx
      .insert(workouts)
      .values({ date, routineId: routineId ?? null, notes: notes ?? null })
      .returning();

    for (let i = 0; i < exerciseData.length; i++) {
      const ex = exerciseData[i];
      const [we] = await tx
        .insert(workoutExercises)
        .values({ workoutId: workout.id, exerciseId: ex.exerciseId, sortOrder: i + 1 })
        .returning();

      if (ex.sets?.length) {
        await tx.insert(sets).values(
          ex.sets.map((s: { reps: number; weightKg?: number | null }, j: number) => ({
            workoutExerciseId: we.id,
            setNumber: j + 1,
            reps: s.reps,
            weightKg: s.weightKg ?? null,
          }))
        );
      }
    }

    return workout.id;
  });

  const full = await getWorkoutById(workoutId);
  return Response.json(full, { status: 201 });
}

export async function getWorkoutById(id: number) {
  const db = getDb();
  const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
  if (!workout) return null;

  const weRows = await db
    .select({ we: workoutExercises, exercise: exercises })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workoutExercises.workoutId, id))
    .orderBy(asc(workoutExercises.sortOrder));

  if (weRows.length === 0) return { ...workout, workoutExercises: [] };

  const weIds = weRows.map((r) => r.we.id);
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

  return {
    ...workout,
    workoutExercises: weRows.map((r) => ({
      ...r.we,
      exercise: r.exercise,
      sets: setsByWeId[r.we.id] ?? [],
    })),
  };
}
