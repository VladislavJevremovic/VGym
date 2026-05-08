import { getDb } from "@/lib/db";
import { workouts, workoutExercises, sets } from "@/drizzle/schema";
import { eq, gte, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "weekly";
  const count = parseInt(searchParams.get("count") || "12");

  const cutoff = new Date();
  if (period === "monthly") {
    cutoff.setMonth(cutoff.getMonth() - count);
  } else {
    cutoff.setDate(cutoff.getDate() - count * 7);
  }
  const cutoffStr = formatDate(cutoff);

  const dateExpr = period === "monthly"
    ? sql<string>`strftime('%Y-%m', ${workouts.date})`
    : sql<string>`strftime('%Y-W%W', ${workouts.date})`;

  const rows = await db
    .select({
      period: dateExpr,
      totalVolume: sql<number>`coalesce(sum(${sets.reps} * ${sets.weightKg}), 0)`,
      workoutCount: sql<number>`count(distinct ${workouts.id})`,
      totalSets: sql<number>`count(${sets.id})`,
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .leftJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(gte(workouts.date, cutoffStr))
    .groupBy(dateExpr)
    .orderBy(sql`${dateExpr} asc`);

  return Response.json(
    rows.map((r) => ({
      period: r.period,
      totalVolume: Math.round(r.totalVolume * 10) / 10,
      workoutCount: r.workoutCount,
      totalSets: r.totalSets,
    }))
  );
}
