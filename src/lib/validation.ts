import { MUSCLE_GROUPS, CATEGORIES } from "./constants";

export function validateDate(date: unknown): string | null {
  if (!date || typeof date !== "string") {
    return "date is required";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return "date must be YYYY-MM-DD";
  }
  return null;
}

export function validateExerciseId(id: unknown): string | null {
  if (!Number.isInteger(id) || (id as number) < 1) {
    return "Invalid exercise ID";
  }
  return null;
}

export function validateSetForCategory(
  set: { reps?: unknown; weightKg?: unknown; durationSeconds?: unknown },
  category: string
): string | null {
  if (category === "cardio") {
    if (!Number.isInteger(set.durationSeconds) || (set.durationSeconds as number) < 1) {
      return "Duration must be a positive number of seconds";
    }
    return null;
  }

  if (!Number.isInteger(set.reps) || (set.reps as number) < 1) {
    return "Reps must be a positive integer";
  }
  if (set.weightKg !== null && set.weightKg !== undefined) {
    if (typeof set.weightKg !== "number" || (set.weightKg as number) < 0) {
      return "Weight must be a non-negative number";
    }
  }
  return null;
}

export interface WorkoutExerciseInput {
  exerciseId: unknown;
  category: string;
  sets?: { reps?: unknown; weightKg?: unknown; durationSeconds?: unknown }[];
}

export function validateExercises(exercises: unknown): string | null {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return "exercises required";
  }

  for (const ex of exercises) {
    if (!ex || typeof ex !== "object") {
      return "Invalid exercise data";
    }
    const exercise = ex as WorkoutExerciseInput;

    const idErr = validateExerciseId(exercise.exerciseId);
    if (idErr) return idErr;

    if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) {
      return "Each exercise must have at least one set";
    }

    for (const s of exercise.sets) {
      const setErr = validateSetForCategory(s, exercise.category);
      if (setErr) return setErr;
    }
  }

  return null;
}

function validateOptionalIsoTimestamp(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return `${field} must be an ISO 8601 string`;
  if (!Number.isFinite(Date.parse(value))) return `${field} must be a valid ISO 8601 timestamp`;
  return null;
}

function validateTimestampPair(body: Record<string, unknown>): string | null {
  const startErr = validateOptionalIsoTimestamp(body.startedAt, "startedAt");
  if (startErr) return startErr;
  const endErr = validateOptionalIsoTimestamp(body.endedAt, "endedAt");
  if (endErr) return endErr;
  if (typeof body.startedAt === "string" && typeof body.endedAt === "string") {
    if (Date.parse(body.endedAt) < Date.parse(body.startedAt)) {
      return "endedAt must not be before startedAt";
    }
  }
  return null;
}

export function validateCreateWorkoutBody(body: Record<string, unknown>): string | null {
  const dateErr = validateDate(body.date);
  if (dateErr) return dateErr;

  const tsErr = validateTimestampPair(body);
  if (tsErr) return tsErr;

  return validateExercises(body.exercises);
}

export function validateUpdateWorkoutBody(body: Record<string, unknown>): string | null {
  const tsErr = validateTimestampPair(body);
  if (tsErr) return tsErr;
  return validateExercises(body.exercises);
}

export function validateRoutineBody(body: Record<string, unknown>): string | null {
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return "Name is required";
  }
  if (!Array.isArray(body.exerciseIds) || body.exerciseIds.length === 0) {
    return "At least one exercise is required";
  }
  for (const id of body.exerciseIds) {
    if (!Number.isInteger(id) || (id as number) < 1) {
      return "Invalid exercise ID in exerciseIds";
    }
  }
  return null;
}

export function validateExerciseBody(body: Record<string, unknown>): string | null {
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return "Name is required";
  }
  if (body.muscleGroup !== undefined) {
    if (typeof body.muscleGroup !== "string" || !(MUSCLE_GROUPS as readonly string[]).includes(body.muscleGroup)) {
      return `Invalid muscle group. Must be one of: ${MUSCLE_GROUPS.join(", ")}`;
    }
  }
  if (body.category !== undefined) {
    if (typeof body.category !== "string" || !(CATEGORIES as readonly string[]).includes(body.category)) {
      return `Invalid category. Must be one of: ${CATEGORIES.join(", ")}`;
    }
  }
  return null;
}
