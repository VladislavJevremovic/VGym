"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import SetInput from "@/components/SetInput";
import SetRow from "@/components/SetRow";
import ErrorBanner from "@/components/ErrorBanner";
import ExercisePicker from "@/components/ExercisePicker";
import type { Routine, WorkoutSet, Exercise } from "@/lib/types";
import { getLocalDateString, mapSetsForApi, getErrorMessage } from "@/lib/utils";

interface LastPerf {
  date: string;
  sets: { reps: number; weightKg: number | null; durationSeconds: number | null }[];
}

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
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [lastPerf, setLastPerf] = useState<LastPerf | null>(null);
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

  const exercises = (routine?.exercises ?? []).filter((e) => e.exercise);
  const currentExercise = exercises[currentStep]?.exercise;
  const isLast = currentStep === exercises.length - 1;

  useEffect(() => {
    if (!currentExercise?.id) return;
    fetch(`/api/exercises/${currentExercise.id}/last`)
      .then((r) => r.ok ? r.json() : null)
      .then(setLastPerf)
      .catch(() => {});
  }, [currentExercise?.id]);

  const getPreviousWeight = (exerciseId: number): number | null => {
    const current = exerciseSets.find((es) => es.exerciseId === exerciseId)?.sets;
    if (current && current.length > 0) {
      const last = current[current.length - 1];
      if (last.weightKg != null) return last.weightKg;
    }
    if (lastPerf && lastPerf.sets.length > 0) {
      const last = lastPerf.sets[lastPerf.sets.length - 1];
      if (last.weightKg != null) return last.weightKg;
    }
    return null;
  };

  if (error) {
    return (
      <div className="p-4">
        <ErrorBanner message={error} />
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

  const currentSets = exerciseSets.find(
    (es) => es.exerciseId === currentExercise?.id
  )?.sets || [];

  const handleAddSet = (reps: number, weight: number | null) => {
    setExerciseSets(
      exerciseSets.map((es) =>
        es.exerciseId === currentExercise?.id
          ? { ...es, sets: [...es.sets, { reps, weightKg: weight ?? null, durationSeconds: null }] }
          : es
      )
    );
  };

  const handleLogCardio = (durationSeconds: number) => {
    setExerciseSets(
      exerciseSets.map((es) =>
        es.exerciseId === currentExercise?.id
          ? { ...es, sets: [{ reps: 0, weightKg: null, durationSeconds }] }
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

  const handleSwapExercise = (newExercise: Exercise) => {
    if (editingStep === null || !routine) return;
    setEditingStep(null);
    setExerciseSets((prev) =>
      prev.map((es, i) =>
        i === editingStep ? { exerciseId: newExercise.id, sets: es.sets } : es
      )
    );
    setRoutine({
      ...routine,
      exercises: routine.exercises.map((e, i) =>
        i === editingStep ? { ...e, exercise: newExercise } : e
      ),
    });
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
            category: exercises.find((e) => e.exercise?.id === es.exerciseId)?.exercise?.category ?? "",
            sets: mapSetsForApi(es.sets),
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save workout");
      router.push("/history");
    } catch (e: unknown) {
      setError(getErrorMessage(e));
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

      <ErrorBanner message={error} />

      {currentExercise && (
        <>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-4">
            {editingStep === currentStep ? (
              <ExercisePicker
                selectedId={currentExercise.id}
                onSelect={handleSwapExercise}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{currentExercise.name}</h2>
                  <span className="text-xs text-zinc-500">{currentExercise.muscleGroup}</span>
                </div>
                <button
                  onClick={() => setEditingStep(currentStep)}
                  className="text-zinc-500 hover:text-emerald-400 transition-colors p-1"
                  aria-label="Swap exercise"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <SetInput category={currentExercise.category} onAdd={handleAddSet} onLogCardio={handleLogCardio} previousWeight={getPreviousWeight(currentExercise.id)} />

          {currentSets.length > 0 && (
            <div className="mt-4 space-y-1">
              {currentSets.map((s, i) => (
                <SetRow
                  key={`${currentExercise.id}-${i}`}
                  setNumber={i + 1}
                  reps={s.reps}
                  weightKg={s.weightKg}
                  durationSeconds={s.durationSeconds ?? null}
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
