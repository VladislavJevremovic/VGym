import { getDb } from "@/lib/db";
import { workouts, workoutExercises, sets } from "@/drizzle/schema";
import { eq, gte, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const months = parseInt(searchParams.get("months") || "12");

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = formatDate(cutoff);

  const rows = await db
    .select({
      date: workouts.date,
      workoutCount: sql<number>`count(distinct ${workouts.id})::int`,
      totalVolume: sql<number>`coalesce(sum(${sets.reps} * ${sets.weightKg}), 0)`,
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .leftJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(gte(workouts.date, cutoffStr))
    .groupBy(workouts.date)
    .orderBy(sql`${workouts.date} asc`);

  return Response.json(
    rows.map((r) => ({
      date: r.date,
      workoutCount: r.workoutCount,
      totalVolume: Math.round(r.totalVolume * 10) / 10,
    }))
  );
}
