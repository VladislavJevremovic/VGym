import { getDb } from "@/lib/db";
import {
  exercises,
  routines,
  routineExercises,
  workouts,
  workoutExercises,
  sets,
} from "@/drizzle/schema";

export async function GET() {
  const db = getDb();

  const [allExercises, allRoutines, allRoutineExercises, allWorkouts, allWorkoutExercises, allSets] =
    await Promise.all([
      db.select().from(exercises).orderBy(exercises.id),
      db.select().from(routines).orderBy(routines.id),
      db.select().from(routineExercises).orderBy(routineExercises.id),
      db.select().from(workouts).orderBy(workouts.id),
      db.select().from(workoutExercises).orderBy(workoutExercises.id),
      db.select().from(sets).orderBy(sets.id),
    ]);

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: allExercises.map((e) => ({
      name: e.name,
      muscleGroup: e.muscleGroup,
      category: e.category,
    })),
    routines: allRoutines.map((r) => ({
      name: r.name,
    })),
    routineExercises: allRoutineExercises.map((re) => {
      const routineIndex = allRoutines.findIndex((r) => r.id === re.routineId);
      const exerciseIndex = allExercises.findIndex((e) => e.id === re.exerciseId);
      return { routineIndex, exerciseIndex, sortOrder: re.sortOrder };
    }),
    workouts: allWorkouts.map((w) => {
      const routineIndex = w.routineId
        ? allRoutines.findIndex((r) => r.id === w.routineId)
        : null;
      return { date: w.date, routineIndex, notes: w.notes };
    }),
    workoutExercises: allWorkoutExercises.map((we) => {
      const workoutIndex = allWorkouts.findIndex((w) => w.id === we.workoutId);
      const exerciseIndex = allExercises.findIndex((e) => e.id === we.exerciseId);
      return { workoutIndex, exerciseIndex, sortOrder: we.sortOrder };
    }),
    sets: allSets.map((s) => {
      const workoutExerciseIndex = allWorkoutExercises.findIndex(
        (we) => we.id === s.workoutExerciseId
      );
      return {
        workoutExerciseIndex,
        setNumber: s.setNumber,
        reps: s.reps,
        weightKg: s.weightKg,
        durationSeconds: s.durationSeconds,
      };
    }),
  };

  const json = JSON.stringify(exportData, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="vgym-backup-${dateStr}.json"`,
    },
  });
}
