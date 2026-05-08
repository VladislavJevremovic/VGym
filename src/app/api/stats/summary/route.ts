import { getDb } from "@/lib/db";
import { workouts, workoutExercises, sets } from "@/drizzle/schema";
import { eq, gte, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export async function GET() {
  const db = getDb();

  const [{ totalWorkouts }] = await db.select({
    totalWorkouts: sql<number>`count(*)`,
  }).from(workouts);

  const volumeResult = await db.select({
    totalVolume: sql<number>`coalesce(sum(${sets.reps} * ${sets.weightKg}), 0)`,
  }).from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id));
  const totalVolume = Math.round((volumeResult[0]?.totalVolume ?? 0) * 10) / 10;

  const allDates = await db.select({ date: workouts.date })
    .from(workouts)
    .orderBy(sql`${workouts.date} desc`);

  const dates = allDates.map((w) => w.date);

  function daysBetween(a: string, b: string): number {
    return (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  }

  let currentStreak = 0;
  const today = new Date();
  const todayStr = formatDate(today);
  const sortedDates = [...new Set(dates)].sort().reverse();
  if (sortedDates.length > 0) {
    const lastWorkout = sortedDates[0];
    if (daysBetween(lastWorkout, todayStr) <= 1) {
      currentStreak = 1;
      let lastDate = lastWorkout;
      for (let i = 1; i < sortedDates.length; i++) {
        if (daysBetween(sortedDates[i], lastDate) <= 2) {
          currentStreak++;
          lastDate = sortedDates[i];
        } else {
          break;
        }
      }
    }
  }

  let longestStreak = 0;
  const uniqueAsc = [...new Set(dates)].sort();
  if (uniqueAsc.length > 0) {
    let run = 1;
    for (let i = 1; i < uniqueAsc.length; i++) {
      if (daysBetween(uniqueAsc[i - 1], uniqueAsc[i]) <= 2) {
        run++;
      } else {
        longestStreak = Math.max(longestStreak, run);
        run = 1;
      }
    }
    longestStreak = Math.max(longestStreak, run, currentStreak);
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const mondayStr = formatDate(monday);
  const [{ daysThisWeek }] = await db.select({
    daysThisWeek: sql<number>`count(distinct ${workouts.date})`,
  }).from(workouts).where(gte(workouts.date, mondayStr));

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = formatDate(weekAgo);
  const weeklyResult = await db.select({
    totalVolume: sql<number>`coalesce(sum(${sets.reps} * ${sets.weightKg}), 0)`,
  }).from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(gte(workouts.date, weekAgoStr));
  const weeklyVolume = Math.round((weeklyResult[0]?.totalVolume ?? 0) * 10) / 10;

  return Response.json({
    totalWorkouts,
    totalVolume,
    currentStreak,
    longestStreak,
    daysThisWeek,
    weeklyVolume,
  });
}
