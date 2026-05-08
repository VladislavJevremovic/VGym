export interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  category: string;
}

export interface RoutineExercise {
  id: number;
  sortOrder: number;
  exercise: Exercise | null;
}

export interface Routine {
  id: number;
  name: string;
  exercises: RoutineExercise[];
}

export interface WorkoutSet {
  id?: number;
  setNumber?: number;
  reps: number;
  weightKg: number | null;
  durationSeconds: number | null;
}

export interface WorkoutExercise {
  id: number;
  exercise: Exercise;
  sets: WorkoutSet[];
}

export interface Workout {
  id: number;
  date: string;
  routineId: number | null;
  notes: string | null;
  workoutExercises: WorkoutExercise[];
}

export interface StatsDataPoint {
  date: string;
  reps: number;
  volume: number;
  maxWeight: number;
  maxReps: number;
  setCount: number;
  e1rm: number;
}

export interface SummaryData {
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  daysThisWeek: number;
  weeklyVolume: number;
}

export interface CalendarDay {
  date: string;
  workoutCount: number;
  totalVolume: number;
}

export interface MuscleGroupVolume {
  muscleGroup: string;
  volume: number;
  setCount: number;
  exerciseCount: number;
}

export interface StrengthRow {
  exerciseId: number;
  name: string;
  muscleGroup: string;
  e1rm: number;
  date: string;
}

export interface IntensityBucket {
  range: string;
  label: string;
  count: number;
}

export interface PRValue {
  value: number;
  weight?: number;
  reps?: number;
  date: string;
}

export interface PRData {
  exerciseId: number;
  name: string;
  muscleGroup: string;
  maxWeight: PRValue | null;
  maxReps: PRValue | null;
  bestE1rm: PRValue | null;
  maxVolume: PRValue | null;
}

export interface VolumePoint {
  period: string;
  totalVolume: number;
  workoutCount: number;
  totalSets: number;
}
