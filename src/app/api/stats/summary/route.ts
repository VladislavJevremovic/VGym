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
  let currentStreak = 0;
  const today = new Date();
  const todayStr = formatDate(today);
  const sortedDates = [...new Set(dates)].sort().reverse();
  for (let i = 0; i < sortedDates.length; i++) {
    const expected = new Date(todayStr);
    expected.setDate(expected.getDate() - i);
    const expectedStr = formatDate(expected);
    if (sortedDates[i] === expectedStr) {
      currentStreak++;
    } else {
      break;
    }
  }

  let longestStreak = 0;
  const uniqueAsc = [...new Set(dates)].sort();
  let run = 1;
  for (let i = 1; i < uniqueAsc.length; i++) {
    const prev = new Date(uniqueAsc[i - 1]);
    const curr = new Date(uniqueAsc[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      run++;
    } else {
      longestStreak = Math.max(longestStreak, run);
      run = 1;
    }
  }
  longestStreak = Math.max(longestStreak, run, currentStreak);

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
