import { getDb } from "@/lib/db";
import {
  exercises,
  routines,
  routineExercises,
  workouts,
  workoutExercises,
  sets,
} from "@/drizzle/schema";
import { sql } from "drizzle-orm";

function validateImportData(data: unknown): string | null {
  if (!data || typeof data !== "object") return "Invalid JSON";
  const d = data as Record<string, unknown>;

  if (d.version !== 1) return "Unsupported version";

  const arrs = ["exercises", "routines", "routineExercises", "workouts", "workoutExercises", "sets"];
  for (const key of arrs) {
    if (!Array.isArray(d[key])) return `Missing or invalid "${key}" array`;
  }

  const exs = d.exercises as unknown[];
  for (const e of exs) {
    if (!e || typeof e !== "object") return "Invalid exercise entry";
    const ex = e as Record<string, unknown>;
    if (typeof ex.name !== "string" || !ex.name.trim()) return "Exercise name is required";
    if (typeof ex.muscleGroup !== "string" || !ex.muscleGroup.trim()) return "Exercise muscleGroup is required";
    if (typeof ex.category !== "string" || !ex.category.trim()) return "Exercise category is required";
  }

  const rts = d.routines as unknown[];
  for (const r of rts) {
    if (!r || typeof r !== "object") return "Invalid routine entry";
    const rt = r as Record<string, unknown>;
    if (typeof rt.name !== "string" || !rt.name.trim()) return "Routine name is required";
  }

  const res = d.routineExercises as unknown[];
  const maxExIdx = (d.exercises as unknown[]).length - 1;
  const maxRtIdx = (d.routines as unknown[]).length - 1;
  for (const re of res) {
    if (!re || typeof re !== "object") return "Invalid routineExercise entry";
    const r = re as Record<string, unknown>;
    if (typeof r.routineIndex !== "number" || r.routineIndex < 0 || r.routineIndex > maxRtIdx)
      return "Invalid routineExercise routineIndex";
    if (typeof r.exerciseIndex !== "number" || r.exerciseIndex < 0 || r.exerciseIndex > maxExIdx)
      return "Invalid routineExercise exerciseIndex";
    if (typeof r.sortOrder !== "number") return "Invalid routineExercise sortOrder";
  }

  const wos = d.workouts as unknown[];
  for (const w of wos) {
    if (!w || typeof w !== "object") return "Invalid workout entry";
    const wo = w as Record<string, unknown>;
    if (typeof wo.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(wo.date))
      return "Invalid workout date";
    if (wo.routineIndex !== null && wo.routineIndex !== undefined) {
      if (typeof wo.routineIndex !== "number" || wo.routineIndex < 0 || wo.routineIndex > maxRtIdx)
        return "Invalid workout routineIndex";
    }
  }

  const wes = d.workoutExercises as unknown[];
  const maxWoIdx = (d.workouts as unknown[]).length - 1;
  for (const we of wes) {
    if (!we || typeof we !== "object") return "Invalid workoutExercise entry";
    const w = we as Record<string, unknown>;
    if (typeof w.workoutIndex !== "number" || w.workoutIndex < 0 || w.workoutIndex > maxWoIdx)
      return "Invalid workoutExercise workoutIndex";
    if (typeof w.exerciseIndex !== "number" || w.exerciseIndex < 0 || w.exerciseIndex > maxExIdx)
      return "Invalid workoutExercise exerciseIndex";
  }

  const sts = d.sets as unknown[];
  const maxWeIdx = (d.workoutExercises as unknown[]).length - 1;
  for (const s of sts) {
    if (!s || typeof s !== "object") return "Invalid set entry";
    const st = s as Record<string, unknown>;
    if (typeof st.workoutExerciseIndex !== "number" || st.workoutExerciseIndex < 0 || st.workoutExerciseIndex > maxWeIdx)
      return "Invalid set workoutExerciseIndex";
    if (typeof st.setNumber !== "number" || st.setNumber < 1) return "Invalid set setNumber";
    if (typeof st.reps !== "number" || st.reps < 0) return "Invalid set reps";
  }

  return null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validateImportData(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const data = body as {
    exercises: { name: string; muscleGroup: string; category: string }[];
    routines: { name: string }[];
    routineExercises: { routineIndex: number; exerciseIndex: number; sortOrder: number }[];
    workouts: { date: string; routineIndex: number | null; notes: string | null }[];
    workoutExercises: { workoutIndex: number; exerciseIndex: number; sortOrder: number }[];
    sets: { workoutExerciseIndex: number; setNumber: number; reps: number; weightKg: number | null; durationSeconds: number | null }[];
  };

  const db = getDb();

  try {
    await db.run(sql`DELETE FROM sets`);
    await db.run(sql`DELETE FROM workout_exercises`);
    await db.run(sql`DELETE FROM workouts`);
    await db.run(sql`DELETE FROM routine_exercises`);
    await db.run(sql`DELETE FROM routines`);
    await db.run(sql`DELETE FROM exercises`);

    let newExerciseIds: number[] = [];
    if (data.exercises.length > 0) {
      const inserted = await db.insert(exercises)
        .values(data.exercises.map((e) => ({
          name: e.name,
          muscleGroup: e.muscleGroup,
          category: e.category,
        })))
        .returning();
      newExerciseIds = inserted.map((e) => e.id);
    }

    let newRoutineIds: number[] = [];
    if (data.routines.length > 0) {
      const inserted = await db.insert(routines)
        .values(data.routines.map((r) => ({ name: r.name })))
        .returning();
      newRoutineIds = inserted.map((r) => r.id);
    }

    if (data.routineExercises.length > 0) {
      await db.insert(routineExercises).values(
        data.routineExercises.map((re) => ({
          routineId: newRoutineIds[re.routineIndex],
          exerciseId: newExerciseIds[re.exerciseIndex],
          sortOrder: re.sortOrder,
        }))
      );
    }

    let newWorkoutIds: number[] = [];
    if (data.workouts.length > 0) {
      const inserted = await db.insert(workouts)
        .values(data.workouts.map((w) => ({
          date: w.date,
          routineId: w.routineIndex !== null && w.routineIndex !== undefined ? newRoutineIds[w.routineIndex] : null,
          notes: w.notes,
        })))
        .returning();
      newWorkoutIds = inserted.map((w) => w.id);
    }

    let newWorkoutExerciseIds: number[] = [];
    if (data.workoutExercises.length > 0) {
      const inserted = await db.insert(workoutExercises)
        .values(data.workoutExercises.map((we) => ({
          workoutId: newWorkoutIds[we.workoutIndex],
          exerciseId: newExerciseIds[we.exerciseIndex],
          sortOrder: we.sortOrder,
        })))
        .returning();
      newWorkoutExerciseIds = inserted.map((we) => we.id);
    }

    if (data.sets.length > 0) {
      await db.insert(sets).values(
        data.sets.map((s) => ({
          workoutExerciseId: newWorkoutExerciseIds[s.workoutExerciseIndex],
          setNumber: s.setNumber,
          reps: s.reps,
          weightKg: s.weightKg,
          durationSeconds: s.durationSeconds,
        }))
      );
    }

    return Response.json({
      imported: {
        exercises: data.exercises.length,
        routines: data.routines.length,
        routineExercises: data.routineExercises.length,
        workouts: data.workouts.length,
        workoutExercises: data.workoutExercises.length,
        sets: data.sets.length,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ error: message }, { status: 500 });
  }
}
