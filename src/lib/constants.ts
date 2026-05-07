export const MUSCLE_GROUPS = ["Chest", "Back", "Trapezius", "LowerBack", "Shoulders", "Biceps", "Triceps", "Forearms", "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Cardio"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const CATEGORIES = ["barbell", "trapbar", "dumbbell", "machine", "cable", "bodyweight", "cardio"] as const;
export type Category = (typeof CATEGORIES)[number];

export const REST_PRESETS = [60, 90, 120, 180] as const;

export const REP_PRESETS = [1, 5, 8, 10, 12, 15, 20] as const;
