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
