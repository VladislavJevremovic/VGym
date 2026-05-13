import { getDb } from "@/lib/db";
import { exercises } from "@/drizzle/schema";
import { asc } from "drizzle-orm";
import { validateExerciseBody } from "@/lib/validation";
import { LibsqlError } from "@libsql/client";

export async function GET() {
  const db = getDb();
  const all = await db.select().from(exercises).orderBy(asc(exercises.muscleGroup), asc(exercises.name));
  return Response.json(all);
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();

  const bodyErr = validateExerciseBody(body);
  if (bodyErr) return Response.json({ error: bodyErr }, { status: 400 });

  try {
    const [exercise] = await db.insert(exercises).values({
      name: body.name.trim(),
      muscleGroup: body.muscleGroup,
      category: body.category,
    }).returning();
    return Response.json(exercise, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof LibsqlError && e.message?.includes("UNIQUE")) {
      return Response.json({ error: "Exercise already exists" }, { status: 409 });
    }
    console.error("[exercises POST]", e);
    throw e;
  }
}
