export const MUSCLE_GROUPS = ["Chest", "Back", "Trapezius", "LowerBack", "Shoulders", "Biceps", "Triceps", "Forearms", "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Cardio"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const CATEGORIES = ["barbell", "trapbar", "dumbbell", "machine", "cable", "bodyweight", "cardio"] as const;
export type Category = (typeof CATEGORIES)[number];

export const REST_PRESETS = [60, 90, 120, 180] as const;

export const REP_PRESETS = [1, 5, 8, 10, 12, 15, 20] as const;

export const CHART_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#eab308", // yellow
  "#8b5cf6", // violet
  "#22c55e", // green
] as const;

export const CHART_OTHERS_INDEX = 5;
