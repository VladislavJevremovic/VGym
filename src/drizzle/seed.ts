import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { exercises, routines, routineExercises } from "./schema";
import { eq } from "drizzle-orm";
import type { MuscleGroup, Category } from "../lib/constants";

const client = createClient({
  url: process.env.TURSO_DB_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client);

const exerciseData: { name: string; muscleGroup: MuscleGroup; category: Category }[] = [
  { name: "DB Bench Press", muscleGroup: "Chest", category: "dumbbell" },
  { name: "DB Incline Press", muscleGroup: "Chest", category: "dumbbell" },
  { name: "DB Fly", muscleGroup: "Chest", category: "dumbbell" },
  { name: "Machine Chest Press", muscleGroup: "Chest", category: "machine" },
  { name: "Machine Chest Fly", muscleGroup: "Chest", category: "machine" },
  { name: "Cable Crossover Fly", muscleGroup: "Chest", category: "cable" },
  { name: "Push-up", muscleGroup: "Chest", category: "bodyweight" },

  { name: "DB Row", muscleGroup: "Back", category: "dumbbell" },
  { name: "Chest-Supported Row", muscleGroup: "Back", category: "dumbbell" },
  { name: "Seated Machine Row", muscleGroup: "Back", category: "machine" },
  { name: "Seated Cable Row", muscleGroup: "Back", category: "cable" },
  { name: "Lat Pulldown (Wide Grip)", muscleGroup: "Back", category: "cable" },
  { name: "Lat Pulldown (Close Grip)", muscleGroup: "Back", category: "cable" },

  { name: "DB Shrug", muscleGroup: "Trapezius", category: "dumbbell" },
  { name: "Cable Shrug", muscleGroup: "Trapezius", category: "cable" },
  { name: "Cable Upright Row", muscleGroup: "Trapezius", category: "cable" },

  { name: "Incline Back Extension", muscleGroup: "LowerBack", category: "machine" },
  { name: "Superman", muscleGroup: "LowerBack", category: "bodyweight" },

  { name: "DB Shoulder Press", muscleGroup: "Shoulders", category: "dumbbell" },
  { name: "DB Front Raise", muscleGroup: "Shoulders", category: "dumbbell" },
  { name: "DB Lateral Raise", muscleGroup: "Shoulders", category: "dumbbell" },
  { name: "DB Back Fly", muscleGroup: "Shoulders", category: "dumbbell" },
  { name: "Machine Shoulder Press", muscleGroup: "Shoulders", category: "machine" },
  { name: "Reverse Pec Deck", muscleGroup: "Shoulders", category: "machine" },
  { name: "Cable Lateral Raise", muscleGroup: "Shoulders", category: "cable" },
  { name: "Cable Face Pull", muscleGroup: "Shoulders", category: "cable" },

  { name: "DB Curl", muscleGroup: "Biceps", category: "dumbbell" },
  { name: "DB Hammer Curl", muscleGroup: "Biceps", category: "dumbbell" },
  { name: "Seated Incline DB Curl", muscleGroup: "Biceps", category: "dumbbell" },
  { name: "Bayesian Cable Curl", muscleGroup: "Biceps", category: "cable" },
  { name: "Cable Bar Curl", muscleGroup: "Biceps", category: "cable" },

  { name: "Overhead Cable Triceps Extension", muscleGroup: "Triceps", category: "cable" },
  { name: "Triceps Bar Pushdown", muscleGroup: "Triceps", category: "cable" },

  { name: "Farmer's Walk", muscleGroup: "Forearms", category: "dumbbell" },

  { name: "DB Squat", muscleGroup: "Quads", category: "dumbbell" },
  { name: "DB Bulgarian Split Squat", muscleGroup: "Quads", category: "dumbbell" },
  { name: "Lunge", muscleGroup: "Quads", category: "dumbbell" },
  { name: "Leg Extension", muscleGroup: "Quads", category: "machine" },
  { name: "Leg Press", muscleGroup: "Quads", category: "machine" },
  { name: "Smith Machine Squat", muscleGroup: "Quads", category: "machine" },

  { name: "Trap Bar Deadlift", muscleGroup: "Hamstrings", category: "trapbar" },
  { name: "DB Romanian Deadlift", muscleGroup: "Hamstrings", category: "dumbbell" },
  { name: "Lying Leg Curl", muscleGroup: "Hamstrings", category: "machine" },
  
  { name: "DB Hip Thrust", muscleGroup: "Glutes", category: "dumbbell" },
  { name: "Glute Kickback", muscleGroup: "Glutes", category: "machine" },
  { name: "Hip Thrust", muscleGroup: "Glutes", category: "bodyweight" },

  { name: "Standing DB Calf Raise", muscleGroup: "Calves", category: "dumbbell" },
  { name: "Seated Calf Raise", muscleGroup: "Calves", category: "machine" },

  { name: "Cable Crunch", muscleGroup: "Core", category: "cable" },
  { name: "Hanging Leg Raise", muscleGroup: "Core", category: "bodyweight" },
  { name: "Plank", muscleGroup: "Core", category: "bodyweight" },

  { name: "Air Bike", muscleGroup: "Cardio", category: "cardio" },
  { name: "Treadmill", muscleGroup: "Cardio", category: "cardio" },
  { name: "Elliptical", muscleGroup: "Cardio", category: "cardio" },
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
    { name: "PPL Push A", e: ["DB Incline Press", "Machine Chest Press", "Machine Chest Fly", "Air Bike"] },
    { name: "PPL Pull A", e: ["Lat Pulldown (Wide Grip)", "Seated Machine Row", "Cable Face Pull", "Air Bike"] },
    { name: "PPL Legs A", e: ["Leg Press", "Trap Bar Deadlift", "Seated Calf Raise", "Air Bike"] },
    { name: "PPL Push B", e: ["DB Shoulder Press", "Machine Chest Press", "Triceps Bar Pushdown", "Air Bike"] },
    { name: "PPL Pull B", e: ["Lat Pulldown (Close Grip)", "Seated Cable Row", "DB Hammer Curl", "Air Bike"] },
    { name: "PPL Legs B", e: ["Smith Machine Squat", "Trap Bar Deadlift", "DB Bulgarian Split Squat", "Air Bike"] },
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
