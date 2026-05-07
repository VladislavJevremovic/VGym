import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { exercises, routines, routineExercises } from "./schema";
import { eq } from "drizzle-orm";

const client = createClient({
  url: process.env.TURSO_DB_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client);

const exerciseData: { name: string; muscleGroup: string; category: string }[] = [
  { name: "Barbell Bench Press", muscleGroup: "Chest", category: "barbell" },
  { name: "DB Incline Press", muscleGroup: "Chest", category: "dumbbell" },
  { name: "DB Flat Press", muscleGroup: "Chest", category: "dumbbell" },
  { name: "DB Decline Press", muscleGroup: "Chest", category: "dumbbell" },
  { name: "Machine Horizontal Chest Press", muscleGroup: "Chest", category: "machine" },
  { name: "Machine Chest Fly", muscleGroup: "Chest", category: "machine" },
  { name: "Cable Crossover", muscleGroup: "Chest", category: "cable" },
  { name: "Dips", muscleGroup: "Chest", category: "bodyweight" },
  { name: "Push-ups", muscleGroup: "Chest", category: "bodyweight" },
  { name: "Barbell Row", muscleGroup: "Back", category: "barbell" },
  { name: "DB Row", muscleGroup: "Back", category: "dumbbell" },
  { name: "Chest-Supported Row", muscleGroup: "Back", category: "machine" },
  { name: "Seated Machine Row", muscleGroup: "Back", category: "machine" },
  { name: "Lat Pulldown (Wide Grip)", muscleGroup: "Back", category: "cable" },
  { name: "Lat Pulldown (Close Grip)", muscleGroup: "Back", category: "cable" },
  { name: "Pull-ups", muscleGroup: "Back", category: "bodyweight" },
  { name: "Cable Pullover", muscleGroup: "Back", category: "cable" },
  { name: "Deadlift", muscleGroup: "Back", category: "barbell" },
  { name: "Trap-Bar RDL", muscleGroup: "Back", category: "barbell" },
  { name: "Barbell OHP", muscleGroup: "Shoulders", category: "barbell" },
  { name: "DB Shoulder Press", muscleGroup: "Shoulders", category: "dumbbell" },
  { name: "Machine Shoulder Press", muscleGroup: "Shoulders", category: "machine" },
  { name: "DB Lateral Raise", muscleGroup: "Shoulders", category: "dumbbell" },
  { name: "Cable Lateral Raise", muscleGroup: "Shoulders", category: "cable" },
  { name: "Reverse Pec Deck", muscleGroup: "Shoulders", category: "machine" },
  { name: "Cable Face Pull", muscleGroup: "Shoulders", category: "cable" },
  { name: "DB Front Raise", muscleGroup: "Shoulders", category: "dumbbell" },
  { name: "Barbell Curl", muscleGroup: "Biceps", category: "barbell" },
  { name: "DB Curl", muscleGroup: "Biceps", category: "dumbbell" },
  { name: "DB Hammer Curl", muscleGroup: "Biceps", category: "dumbbell" },
  { name: "Bayesian Cable Curl", muscleGroup: "Biceps", category: "cable" },
  { name: "Cable Curl", muscleGroup: "Biceps", category: "cable" },
  { name: "Preacher Curl", muscleGroup: "Biceps", category: "barbell" },
  { name: "Close-Grip Bench Press", muscleGroup: "Triceps", category: "barbell" },
  { name: "Overhead Cable Triceps Extension", muscleGroup: "Triceps", category: "cable" },
  { name: "Triceps Bar Pushdown", muscleGroup: "Triceps", category: "cable" },
  { name: "Rope Pushdown", muscleGroup: "Triceps", category: "cable" },
  { name: "Skull Crusher", muscleGroup: "Triceps", category: "barbell" },
  { name: "DB Overhead Extension", muscleGroup: "Triceps", category: "dumbbell" },
  { name: "Barbell Squat", muscleGroup: "Legs", category: "barbell" },
  { name: "Smith Machine Squat", muscleGroup: "Legs", category: "machine" },
  { name: "Leg Press", muscleGroup: "Legs", category: "machine" },
  { name: "Leg Curls", muscleGroup: "Legs", category: "machine" },
  { name: "Leg Extension", muscleGroup: "Legs", category: "machine" },
  { name: "Romanian Deadlift", muscleGroup: "Legs", category: "barbell" },
  { name: "Hip Thrust", muscleGroup: "Legs", category: "barbell" },
  { name: "Bulgarian Split Squat", muscleGroup: "Legs", category: "dumbbell" },
  { name: "Lunges", muscleGroup: "Legs", category: "dumbbell" },
  { name: "Standing DB Calf Raise", muscleGroup: "Legs", category: "dumbbell" },
  { name: "Seated Calf Raise", muscleGroup: "Legs", category: "machine" },
  { name: "Plank", muscleGroup: "Core", category: "bodyweight" },
  { name: "Cable Crunch", muscleGroup: "Core", category: "cable" },
  { name: "Hanging Leg Raise", muscleGroup: "Core", category: "bodyweight" },
  { name: "Ab Wheel Rollout", muscleGroup: "Core", category: "bodyweight" },
  { name: "Air Bike", muscleGroup: "Cardio", category: "cardio" },
  { name: "Treadmill", muscleGroup: "Cardio", category: "cardio" },
  { name: "Rowing Machine", muscleGroup: "Cardio", category: "cardio" },
  { name: "Stairmaster", muscleGroup: "Cardio", category: "cardio" },
];

async function seed() {
  console.log("Seeding exercises...");

  for (const ex of exerciseData) {
    await db.insert(exercises).values(ex).onConflictDoUpdate({ target: exercises.name, set: ex });
  }

  const allExercises = await db.select().from(exercises);
  const findId = (name: string) => {
    const found = allExercises.find((e) => e.name === name);
    if (!found) throw new Error(`Exercise not found: ${name}`);
    return found.id;
  };

  console.log("Seeding routines...");

  const routineDefs = [
    { name: "Workout A", e: ["Leg Press", "DB Incline Press", "Chest-Supported Row"] },
    { name: "Workout B", e: ["Trap-Bar RDL", "Machine Horizontal Chest Press", "Lat Pulldown (Wide Grip)"] },
    { name: "Workout C", e: ["Smith Machine Squat", "DB Shoulder Press", "Lat Pulldown (Close Grip)"] },
    { name: "Off-Day Supplementals", e: ["Bayesian Cable Curl", "DB Hammer Curl", "Reverse Pec Deck", "Overhead Cable Triceps Extension", "Machine Chest Fly", "DB Lateral Raise", "Standing DB Calf Raise", "Leg Curls", "Plank"] },
  ];

  for (const rd of routineDefs) {
    await db.insert(routines).values({ name: rd.name }).onConflictDoUpdate({ target: routines.name, set: { name: rd.name } });
    const [routine] = await db.select().from(routines).where(eq(routines.name, rd.name));
    await db.delete(routineExercises).where(eq(routineExercises.routineId, routine.id));
    for (let j = 0; j < rd.e.length; j++) {
      await db.insert(routineExercises).values({ routineId: routine.id, exerciseId: findId(rd.e[j]), sortOrder: j + 1 });
    }
  }

  console.log("Seed complete!");
}

seed().catch(console.error).finally(() => process.exit(0));
