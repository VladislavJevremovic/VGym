import { describe, it, expect } from "vitest";
import {
  validateDate,
  validateExerciseId,
  validateSetForCategory,
  validateExercises,
  validateCreateWorkoutBody,
  validateUpdateWorkoutBody,
  validateRoutineBody,
  validateExerciseBody,
} from "./validation";

// ── validateDate ──────────────────────────────────────────────
describe("validateDate", () => {
  it("accepts a valid YYYY-MM-DD date", () => {
    expect(validateDate("2025-05-08")).toBeNull();
  });

  it("rejects undefined", () => {
    expect(validateDate(undefined)).toBe("date is required");
  });

  it("rejects null", () => {
    expect(validateDate(null)).toBe("date is required");
  });

  it("rejects empty string", () => {
    expect(validateDate("")).toBe("date is required");
  });

  it("rejects non-string types", () => {
    expect(validateDate(123)).toBe("date is required");
    expect(validateDate(true)).toBe("date is required");
  });

  it("rejects malformed date strings", () => {
    expect(validateDate("2025/05/08")).toBe("date must be YYYY-MM-DD");
    expect(validateDate("05-08-2025")).toBe("date must be YYYY-MM-DD");
    expect(validateDate("2025-5-8")).toBe("date must be YYYY-MM-DD");
    expect(validateDate("tomorrow")).toBe("date must be YYYY-MM-DD");
  });
});

// ── validateExerciseId ────────────────────────────────────────
describe("validateExerciseId", () => {
  it("accepts a positive integer", () => {
    expect(validateExerciseId(1)).toBeNull();
    expect(validateExerciseId(42)).toBeNull();
  });

  it("rejects non-integer numbers", () => {
    expect(validateExerciseId(1.5)).toBe("Invalid exercise ID");
  });

  it("rejects zero", () => {
    expect(validateExerciseId(0)).toBe("Invalid exercise ID");
  });

  it("rejects negative numbers", () => {
    expect(validateExerciseId(-1)).toBe("Invalid exercise ID");
  });

  it("rejects non-numbers", () => {
    expect(validateExerciseId("abc")).toBe("Invalid exercise ID");
    expect(validateExerciseId(null)).toBe("Invalid exercise ID");
    expect(validateExerciseId(undefined)).toBe("Invalid exercise ID");
  });
});

// ── validateSetForCategory ────────────────────────────────────
describe("validateSetForCategory", () => {
  describe("cardio", () => {
    it("accepts positive durationSeconds", () => {
      expect(validateSetForCategory({ durationSeconds: 1800 }, "cardio")).toBeNull();
      expect(validateSetForCategory({ durationSeconds: 1 }, "cardio")).toBeNull();
    });

    it("rejects missing durationSeconds", () => {
      expect(validateSetForCategory({}, "cardio")).toBe("Duration must be a positive number of seconds");
    });

    it("rejects zero durationSeconds", () => {
      expect(validateSetForCategory({ durationSeconds: 0 }, "cardio")).toBe("Duration must be a positive number of seconds");
    });

    it("rejects negative durationSeconds", () => {
      expect(validateSetForCategory({ durationSeconds: -1 }, "cardio")).toBe("Duration must be a positive number of seconds");
    });

    it("rejects non-integer durationSeconds", () => {
      expect(validateSetForCategory({ durationSeconds: 30.5 }, "cardio")).toBe("Duration must be a positive number of seconds");
    });

    it("ignores reps and weight for cardio", () => {
      expect(validateSetForCategory({ reps: 10, weightKg: 50, durationSeconds: 600 }, "cardio")).toBeNull();
    });
  });

  describe("strength (non-cardio)", () => {
    it("accepts valid reps without weight", () => {
      expect(validateSetForCategory({ reps: 10 }, "dumbbell")).toBeNull();
    });

    it("accepts valid reps with weight", () => {
      expect(validateSetForCategory({ reps: 8, weightKg: 50 }, "barbell")).toBeNull();
    });

    it("accepts zero weight", () => {
      expect(validateSetForCategory({ reps: 10, weightKg: 0 }, "machine")).toBeNull();
    });

    it("rejects missing reps", () => {
      expect(validateSetForCategory({}, "dumbbell")).toBe("Reps must be a positive integer");
    });

    it("rejects zero reps", () => {
      expect(validateSetForCategory({ reps: 0 }, "dumbbell")).toBe("Reps must be a positive integer");
    });

    it("rejects negative reps", () => {
      expect(validateSetForCategory({ reps: -1 }, "dumbbell")).toBe("Reps must be a positive integer");
    });

    it("rejects non-integer reps", () => {
      expect(validateSetForCategory({ reps: 5.5 }, "dumbbell")).toBe("Reps must be a positive integer");
    });

    it("rejects negative weight", () => {
      expect(validateSetForCategory({ reps: 10, weightKg: -5 }, "dumbbell")).toBe("Weight must be a non-negative number");
    });

    it("rejects non-numeric weight", () => {
      expect(validateSetForCategory({ reps: 10, weightKg: "heavy" }, "dumbbell")).toBe("Weight must be a non-negative number");
    });
  });
});

// ── validateExercises ─────────────────────────────────────────
describe("validateExercises", () => {
  it("rejects undefined", () => {
    expect(validateExercises(undefined)).toBe("exercises required");
  });

  it("rejects empty array", () => {
    expect(validateExercises([])).toBe("exercises required");
  });

  it("rejects non-array", () => {
    expect(validateExercises("foo")).toBe("exercises required");
  });

  it("rejects exercises without ID", () => {
    expect(validateExercises([{ category: "dumbbell", sets: [{ reps: 10 }] }])).toBe("Invalid exercise ID");
  });

  it("rejects exercises with invalid ID", () => {
    expect(validateExercises([{ exerciseId: -1, category: "dumbbell", sets: [{ reps: 10 }] }])).toBe("Invalid exercise ID");
  });

  it("rejects exercises without sets", () => {
    expect(validateExercises([{ exerciseId: 1, category: "dumbbell" }])).toBe("Each exercise must have at least one set");
  });

  it("rejects exercises with empty sets", () => {
    expect(validateExercises([{ exerciseId: 1, category: "dumbbell", sets: [] }])).toBe("Each exercise must have at least one set");
  });

  it("accepts valid strength exercises", () => {
    expect(
      validateExercises([
        { exerciseId: 1, category: "dumbbell", sets: [{ reps: 10, weightKg: 20 }] },
        { exerciseId: 2, category: "machine", sets: [{ reps: 12 }] },
      ])
    ).toBeNull();
  });

  it("accepts valid cardio exercises", () => {
    expect(
      validateExercises([
        { exerciseId: 3, category: "cardio", sets: [{ durationSeconds: 1800 }] },
      ])
    ).toBeNull();
  });

  it("accepts mixed strength and cardio", () => {
    expect(
      validateExercises([
        { exerciseId: 1, category: "dumbbell", sets: [{ reps: 10, weightKg: 20 }] },
        { exerciseId: 3, category: "cardio", sets: [{ durationSeconds: 600 }] },
      ])
    ).toBeNull();
  });

  it("rejects cardio with missing duration", () => {
    expect(
      validateExercises([
        { exerciseId: 3, category: "cardio", sets: [{ reps: 1 }] },
      ])
    ).toBe("Duration must be a positive number of seconds");
  });

  it("rejects strength with missing reps", () => {
    expect(
      validateExercises([
        { exerciseId: 1, category: "dumbbell", sets: [{ weightKg: 20 }] },
      ])
    ).toBe("Reps must be a positive integer");
  });
});

// ── validateCreateWorkoutBody ─────────────────────────────────
describe("validateCreateWorkoutBody", () => {
  it("rejects missing date", () => {
    expect(validateCreateWorkoutBody({})).toBe("date is required");
  });

  it("rejects missing exercises", () => {
    expect(validateCreateWorkoutBody({ date: "2025-05-08" })).toBe("exercises required");
  });

  it("accepts valid body", () => {
    expect(
      validateCreateWorkoutBody({
        date: "2025-05-08",
        exercises: [{ exerciseId: 1, category: "dumbbell", sets: [{ reps: 10 }] }],
      })
    ).toBeNull();
  });

  it("rejects body with cardio but no duration", () => {
    expect(
      validateCreateWorkoutBody({
        date: "2025-05-08",
        exercises: [{ exerciseId: 1, category: "cardio", sets: [{ reps: 10 }] }],
      })
    ).toBe("Duration must be a positive number of seconds");
  });
});

// ── validateUpdateWorkoutBody ─────────────────────────────────
describe("validateUpdateWorkoutBody", () => {
  it("rejects missing exercises", () => {
    expect(validateUpdateWorkoutBody({})).toBe("exercises required");
  });

  it("accepts body without date", () => {
    // This is the exact case that was buggy — date is omitted during edit
    expect(
      validateUpdateWorkoutBody({
        exercises: [{ exerciseId: 1, category: "dumbbell", sets: [{ reps: 10 }] }],
      })
    ).toBeNull();
  });

  it("accepts body with date too", () => {
    expect(
      validateUpdateWorkoutBody({
        date: "2025-05-08",
        exercises: [{ exerciseId: 1, category: "dumbbell", sets: [{ reps: 10 }] }],
      })
    ).toBeNull();
  });
});

// ── validateRoutineBody ───────────────────────────────────────
describe("validateRoutineBody", () => {
  it("accepts valid name and exerciseIds", () => {
    expect(validateRoutineBody({ name: "Push Day", exerciseIds: [1, 2, 3] })).toBeNull();
  });

  it("rejects missing name", () => {
    expect(validateRoutineBody({ exerciseIds: [1] })).toBe("Name is required");
  });

  it("rejects empty name", () => {
    expect(validateRoutineBody({ name: "", exerciseIds: [1] })).toBe("Name is required");
  });

  it("rejects non-string name", () => {
    expect(validateRoutineBody({ name: 123, exerciseIds: [1] })).toBe("Name is required");
  });

  it("rejects whitespace-only name", () => {
    expect(validateRoutineBody({ name: "   ", exerciseIds: [1] })).toBe("Name is required");
  });

  it("rejects missing exerciseIds", () => {
    expect(validateRoutineBody({ name: "Push" })).toBe("At least one exercise is required");
  });

  it("rejects empty exerciseIds", () => {
    expect(validateRoutineBody({ name: "Push", exerciseIds: [] })).toBe("At least one exercise is required");
  });

  it("rejects non-array exerciseIds", () => {
    expect(validateRoutineBody({ name: "Push", exerciseIds: "abc" })).toBe("At least one exercise is required");
  });

  it("rejects exerciseIds with non-positive integers", () => {
    expect(validateRoutineBody({ name: "Push", exerciseIds: [0] })).toBe("Invalid exercise ID in exerciseIds");
    expect(validateRoutineBody({ name: "Push", exerciseIds: [-1] })).toBe("Invalid exercise ID in exerciseIds");
    expect(validateRoutineBody({ name: "Push", exerciseIds: [1.5] })).toBe("Invalid exercise ID in exerciseIds");
    expect(validateRoutineBody({ name: "Push", exerciseIds: ["abc"] })).toBe("Invalid exercise ID in exerciseIds");
  });
});

// ── validateExerciseBody ──────────────────────────────────────
describe("validateExerciseBody", () => {
  it("accepts valid name", () => {
    expect(validateExerciseBody({ name: "DB Press", muscleGroup: "Chest", category: "dumbbell" })).toBeNull();
  });

  it("rejects missing name", () => {
    expect(validateExerciseBody({})).toBe("Name is required");
  });

  it("rejects empty name", () => {
    expect(validateExerciseBody({ name: "" })).toBe("Name is required");
  });

  it("rejects whitespace-only name", () => {
    expect(validateExerciseBody({ name: "   " })).toBe("Name is required");
  });

  it("rejects non-string name", () => {
    expect(validateExerciseBody({ name: true })).toBe("Name is required");
  });

  it("rejects invalid muscleGroup type", () => {
    expect(validateExerciseBody({ name: "Test", muscleGroup: 123 })).toMatch(/^Invalid muscle group/);
  });

  it("rejects invalid category type", () => {
    expect(validateExerciseBody({ name: "Test", category: 456 })).toMatch(/^Invalid category/);
  });

  it("accepts name without muscleGroup or category", () => {
    expect(validateExerciseBody({ name: "Test" })).toBeNull();
  });
});
