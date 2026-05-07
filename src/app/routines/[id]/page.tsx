"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import SetInput from "@/components/SetInput";
import SetRow from "@/components/SetRow";
import type { Routine, WorkoutSet } from "@/lib/types";
import { getLocalDateString } from "@/lib/utils";

interface ExerciseSets {
  exerciseId: number;
  sets: WorkoutSet[];
}

export default function RoutineSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSets[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/routines")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load routine");
        return r.json();
      })
      .then((data: Routine[]) => {
        const found = data.find((r) => r.id === parseInt(id));
        if (found) {
          setRoutine(found);
          setExerciseSets(
            found.exercises
              .filter((e) => e.exercise)
              .map((e) => ({ exerciseId: e.exercise!.id, sets: [] }))
          );
        } else {
          setError("Routine not found");
        }
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">Loading...</h1>
      </div>
    );
  }

  const exercises = routine.exercises.filter((e) => e.exercise);
  const currentExercise = exercises[currentStep]?.exercise;
  const isLast = currentStep === exercises.length - 1;

  const currentSets = exerciseSets.find(
    (es) => es.exerciseId === currentExercise?.id
  )?.sets || [];

  const handleAddSet = (reps: number, weight: number | null) => {
    setExerciseSets(
      exerciseSets.map((es) =>
        es.exerciseId === currentExercise?.id
          ? { ...es, sets: [...es.sets, { reps, weightKg: weight ?? null }] }
          : es
      )
    );
  };

  const handleDeleteSet = (setIndex: number) => {
    setExerciseSets(
      exerciseSets.map((es) =>
        es.exerciseId === currentExercise?.id
          ? { ...es, sets: es.sets.filter((_, i) => i !== setIndex) }
          : es
      )
    );
  };

  const handleNext = () => {
    if (isLast) {
      handleSave();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSave = async () => {
    const nonEmpty = exerciseSets.filter((es) => es.sets.length > 0);
    if (nonEmpty.length === 0) {
      setError("Log at least one set before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: getLocalDateString(),
          routineId: routine.id,
          exercises: nonEmpty.map((es) => ({
            exerciseId: es.exerciseId,
            sets: es.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg })),
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save workout");
      router.push("/history");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save workout");
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push("/routines")} className="text-zinc-500 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold">{routine.name}</h1>
          <p className="text-xs text-zinc-500">
            Exercise {currentStep + 1} of {exercises.length}
          </p>
        </div>
      </div>

      <div className="w-full bg-zinc-900 rounded-full h-1 mb-6">
        <div
          className="bg-emerald-500 h-1 rounded-full transition-all"
          style={{ width: `${((currentStep + 1) / exercises.length) * 100}%` }}
        />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {exercises.map((e, i) => {
          const sets = exerciseSets.find((es) => es.exerciseId === e.exercise?.id);
          const done = sets && sets.sets.length > 0;
          return (
            <button
              key={e.id}
              onClick={() => setCurrentStep(i)}
              className={`w-9 h-9 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
                i === currentStep
                  ? "bg-emerald-500 text-black"
                  : done
                  ? "bg-emerald-500/30 text-emerald-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {currentExercise && (
        <>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-4">
            <h2 className="text-xl font-bold text-white">{currentExercise.name}</h2>
            <span className="text-xs text-zinc-500">{currentExercise.muscleGroup}</span>
          </div>

          <SetInput onAdd={handleAddSet} />

          {currentSets.length > 0 && (
            <div className="mt-4 space-y-1">
              {currentSets.map((s, i) => (
                <SetRow
                  key={`${currentExercise.id}-${i}`}
                  setNumber={i + 1}
                  reps={s.reps}
                  weightKg={s.weightKg}
                  onDelete={() => handleDeleteSet(i)}
                />
              ))}
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={saving}
            className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold rounded-xl py-4 text-lg transition-colors"
          >
            {saving ? "Saving..." : isLast ? "Finish & Save" : "Next Exercise"}
          </button>
        </>
      )}
    </div>
  );
}
