import { getDb } from "@/lib/db";
import { exercises } from "@/drizzle/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const all = await db.select().from(exercises).orderBy(asc(exercises.muscleGroup), asc(exercises.name));
  return Response.json(all);
}
