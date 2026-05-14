"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ExercisePicker from "@/components/ExercisePicker";
import SetInput from "@/components/SetInput";
import SetRow from "@/components/SetRow";
import ErrorBanner from "@/components/ErrorBanner";
import type { Exercise, Workout, WorkoutSet, PRData } from "@/lib/types";
import { getLocalDateString, fmtDuration, fmtElapsed, mapSetsForApi, getErrorMessage } from "@/lib/utils";
import { loadDraft, saveDraft, clearDraft } from "@/lib/draft";

interface LastPerf {
  date: string;
  sets: { reps: number; weightKg: number | null; durationSeconds: number | null }[];
}

interface LoggedExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
}

function LogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [lastPerf, setLastPerf] = useState<LastPerf | null>(null);
  const [lastPerfLoading, setLastPerfLoading] = useState(false);
  const [loggedExercises, setLoggedExercises] = useState<LoggedExercise[]>([]);
  const [prBadges, setPrBadges] = useState<Record<string, string>>({});
  const [prs, setPrs] = useState<Map<number, PRData>>(new Map());
  const [prsLoaded, setPrsLoaded] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [resumedDraft, setResumedDraft] = useState(false);
  const [elapsed, setElapsed] = useState<string>("");

  useEffect(() => {
    if (editId) return;
    const draft = loadDraft();
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoggedExercises(draft.loggedExercises);
      setNotes(draft.notes);
      setStartedAt(draft.startedAt);
      setResumedDraft(true);
    }
  }, [editId]);

  useEffect(() => {
    if (editId) return;
    if (loggedExercises.length === 0) {
      clearDraft();
      return;
    }
    if (!startedAt) return;
    saveDraft({ startedAt, notes, loggedExercises });
  }, [editId, loggedExercises, notes, startedAt]);

  useEffect(() => {
    if (!startedAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed("");
      return;
    }
    const tick = () => setElapsed(fmtElapsed(startedAt));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/workouts/${editId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load workout");
        return r.json();
      })
      .then((workout: Workout) => {
        setLoggedExercises(
          workout.workoutExercises.map((we) => ({
            exercise: we.exercise,
            sets: mapSetsForApi(we.sets),
          }))
        );
        setNotes(workout.notes ?? "");
      })
      .catch((e: Error) => setError(e.message));
  }, [editId]);

  useEffect(() => {
    fetch("/api/stats/prs")
      .then((r) => r.ok ? r.json() : [])
      .then((data: PRData[]) => {
        const map = new Map<number, PRData>();
        for (const pr of data) map.set(pr.exerciseId, pr);
        setPrs(map);
        setPrsLoaded(true);
      })
      .catch(() => setPrsLoaded(true));
  }, []);

  useEffect(() => {
    window.__vgym_dirty = loggedExercises.length > 0;
    if (loggedExercises.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.__vgym_dirty = false;
    };
  }, [loggedExercises.length]);

  const getPreviousWeight = (exerciseId: number): number | null => {
    const current = loggedExercises.find((le) => le.exercise.id === exerciseId)?.sets;
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

  const handleSelectExercise = async (ex: Exercise) => {
    setSelectedExercise(ex);
    setLastPerf(null);
    setLastPerfLoading(true);
    try {
      const res = await fetch(`/api/exercises/${ex.id}/last`);
      if (res.ok) {
        const data = await res.json();
        setLastPerf(data);
      }
    } catch {
    } finally {
      setLastPerfLoading(false);
    }
  };

  const handleAddSet = (reps: number, weight: number | null) => {
    if (!selectedExercise) return;
    if (!editId && !startedAt) setStartedAt(new Date().toISOString());
    const existing = loggedExercises.find((le) => le.exercise.id === selectedExercise.id);
    const newSet: WorkoutSet = { reps, weightKg: weight ?? null, durationSeconds: null };

    const newIndex = existing ? existing.sets.length : 0;

    if (existing) {
      setLoggedExercises(
        loggedExercises.map((le) =>
          le.exercise.id === selectedExercise.id
            ? { ...le, sets: [...le.sets, newSet] }
            : le
        )
      );
    } else {
      setLoggedExercises([
        ...loggedExercises,
        { exercise: selectedExercise, sets: [newSet] },
      ]);
    }

    if (prsLoaded && weight) {
      const existingPr = prs.get(selectedExercise.id);
      let badge = "";
      if (!existingPr || !existingPr.maxWeight) {
        badge = "PR";
      } else {
        if (weight > (existingPr.maxWeight?.value ?? 0)) {
          badge = "PR";
        } else if (weight * (1 + reps / 30) > (existingPr.bestE1rm?.value ?? 0)) {
          badge = "e1RM";
        } else if (reps > (existingPr.maxReps?.value ?? 0)) {
          badge = "Reps";
        } else if ((reps * weight) > (existingPr.maxVolume?.value ?? 0)) {
          badge = "Volume";
        }
      }
      if (badge) {
        const key = `${selectedExercise.id}-${newIndex}`;
        setPrBadges((prev) => ({ ...prev, [key]: badge }));
      }
    }
  };

  const handleLogCardio = (durationSeconds: number) => {
    if (!selectedExercise) return;
    if (!editId && !startedAt) setStartedAt(new Date().toISOString());
    const existing = loggedExercises.find((le) => le.exercise.id === selectedExercise.id);
    const newSet: WorkoutSet = { reps: 0, weightKg: null, durationSeconds };
    if (existing) {
      setLoggedExercises(
        loggedExercises.map((le) =>
          le.exercise.id === selectedExercise.id
            ? { ...le, sets: [newSet] }
            : le
        )
      );
    } else {
      setLoggedExercises([
        ...loggedExercises,
        { exercise: selectedExercise, sets: [newSet] },
      ]);
    }
  };

  const handleDeleteSet = (exerciseId: number, setIndex: number) => {
    const next = loggedExercises
      .map((le) =>
        le.exercise.id === exerciseId
          ? { ...le, sets: le.sets.filter((_, i) => i !== setIndex) }
          : le
      )
      .filter((le) => le.sets.length > 0);
    setLoggedExercises(next);
    if (next.length === 0) {
      setStartedAt(null);
      setResumedDraft(false);
    }
  };

  const handleSave = async () => {
    if (!loggedExercises.length) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        date: editId ? undefined : getLocalDateString(),
        routineId: null,
        notes: notes.trim() || null,
        exercises: loggedExercises.map((le) => ({
          exerciseId: le.exercise.id,
          category: le.exercise.category,
          sets: mapSetsForApi(le.sets),
        })),
      };

      if (!editId) {
        body.startedAt = startedAt ?? new Date().toISOString();
        body.endedAt = new Date().toISOString();
      }

      if (editId) {
        const res = await fetch(`/api/workouts/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update workout");
        router.push("/history");
      } else {
        const res = await fetch("/api/workouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to save workout");
        clearDraft();
        setLoggedExercises([]);
        setSelectedExercise(null);
        setLastPerf(null);
        setNotes("");
        setStartedAt(null);
        setResumedDraft(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{editId ? "Edit Workout" : "Log Workout"}</h1>
        <div className="flex items-center gap-3">
          {editId && (
            <button onClick={() => router.push("/history")} className="text-sm text-zinc-500 hover:text-white transition-colors">
              Cancel
            </button>
          )}
          <span className="text-sm text-zinc-500">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            {!editId && startedAt && elapsed ? ` · ${elapsed}` : ""}
          </span>
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 text-sm text-center mb-4">
          Workout saved!
        </div>
      )}

      <ErrorBanner message={error} />

      {resumedDraft && !editId && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 mb-4 flex items-center justify-between">
          <p className="text-xs text-zinc-400">Resumed in-progress workout</p>
          <button
            onClick={() => setResumedDraft(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <ExercisePicker onSelect={handleSelectExercise} />

      {selectedExercise && (
        <div className="mt-4">
          {lastPerfLoading && (
            <div className="mb-3 h-8 bg-zinc-900 rounded-lg animate-pulse" />
          )}
          {!lastPerfLoading && lastPerf && selectedExercise.category !== "cardio" && (
            <div className="mb-3 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2">
              <p className="text-xs text-zinc-500 mb-1">
                Last:{" "}
                {new Date(lastPerf.date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <div className="flex gap-2 flex-wrap">
                {lastPerf.sets.map((s, i) => (
                  <span key={i} className="text-xs text-zinc-400 bg-zinc-800 rounded px-2 py-0.5">
                    {s.durationSeconds ? fmtDuration(s.durationSeconds) : `${s.reps}${s.weightKg ? ` × ${s.weightKg}kg` : " reps"}`}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!lastPerfLoading && !lastPerf && (
            <p className="text-xs text-zinc-600 mb-3">No previous data for this exercise</p>
          )}
          <SetInput category={selectedExercise.category} onAdd={handleAddSet} onLogCardio={handleLogCardio} previousWeight={getPreviousWeight(selectedExercise.id)} />
        </div>
      )}

      {loggedExercises.length > 0 && (
        <div className="mt-6 space-y-4">
          {loggedExercises.map((le) => (
            <div key={le.exercise.id} className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-white">{le.exercise.name}</span>
                <span className="text-xs text-zinc-600">{le.exercise.muscleGroup}</span>
                <span className="ml-auto text-xs text-emerald-500 font-mono">{le.sets.length} set{le.sets.length > 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-1">
                {le.sets.map((s, i) => (
                  <SetRow
                    key={`${le.exercise.id}-${i}`}
                    setNumber={i + 1}
                    reps={s.reps}
                    weightKg={s.weightKg ?? null}
                    durationSeconds={s.durationSeconds ?? null}
                    onDelete={() => handleDeleteSet(le.exercise.id, i)}
                    prBadge={prBadges[`${le.exercise.id}-${i}`] ?? null}
                  />
                ))}
              </div>
            </div>
          ))}

          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)..."
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold rounded-xl py-4 text-lg transition-colors"
          >
            {saving ? "Saving..." : (editId ? "Save Changes" : "Save Workout")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function LogPage() {
  return (
    <Suspense>
      <LogContent />
    </Suspense>
  );
}
