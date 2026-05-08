"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react";
import ErrorBanner from "@/components/ErrorBanner";
import UndoToast from "@/components/UndoToast";
import type { Workout } from "@/lib/types";
import { fmtDuration, mapSetsForApi, getErrorMessage } from "@/lib/utils";

const PAGE_SIZE = 20;

async function fetchWorkoutsPage(beforeId?: number): Promise<Workout[]> {
  const params = `full=true&limit=${PAGE_SIZE}${beforeId ? `&beforeId=${beforeId}` : ""}`;
  const res = await fetch(`/api/workouts?${params}`);
  if (!res.ok) throw new Error("Failed to load workouts");
  return res.json();
}

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [undoTarget, setUndoTarget] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchWorkoutsPage()
      .then((data) => {
        setWorkouts(data);
        setHasMore(data.length === PAGE_SIZE);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const lastId = workouts[workouts.length - 1]?.id;
      const data = await fetchWorkoutsPage(lastId);
      setWorkouts((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!undoTarget) return;
    const id = setTimeout(() => setUndoTarget(null), 5000);
    return () => clearTimeout(id);
  }, [undoTarget]);

  const handleDeleteClick = async (id: number) => {
    const workout = workouts.find((w) => w.id === id);
    if (!workout) return;
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    setUndoTarget(workout);
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete workout");
    } catch {
      setWorkouts((prev) => [...prev, workout].sort((a, b) => b.date.localeCompare(a.date)));
      setUndoTarget(null);
    }
  };

  const handleUndo = async () => {
    const target = undoTarget;
    if (!target) return;
    setUndoTarget(null);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: target.date,
          routineId: target.routineId,
          notes: target.notes,
          exercises: target.workoutExercises.map((we) => ({
            exerciseId: we.exercise.id,
            category: we.exercise.category,
            sets: mapSetsForApi(we.sets),
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to restore workout");
      const newWorkout = await res.json();
      setWorkouts((prev) => [...prev, newWorkout].sort((a, b) => b.date.localeCompare(a.date)));
    } catch {
      setError("Failed to restore workout");
    }
  };

  const groupByMonth = () => {
    const map: Record<string, Workout[]> = {};
    for (const w of workouts) {
      const month = w.date.substring(0, 7);
      if (!map[month]) map[month] = [];
      map[month].push(w);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const grouped = groupByMonth();

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">History</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-zinc-900 rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">History</h1>

      <ErrorBanner message={error} />

      {workouts.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-zinc-500 text-lg mb-2">No workouts yet</p>
          <p className="text-zinc-600 text-sm">Start logging to see your history here</p>
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(([month, monthWorkouts]) => {
          const monthName = new Date(month + "-01").toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          });
          return (
            <div key={month}>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                {monthName}
              </h2>
              <div className="space-y-2">
                {monthWorkouts.map((w) => {
                  const expanded = expandedId === w.id;
                  const totalSets = w.workoutExercises.reduce(
                    (sum, we) => sum + we.sets.length, 0
                  );
                  return (
                    <div
                      key={w.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedId(expanded ? null : w.id)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">
                            {new Date(w.date + "T00:00:00").toLocaleDateString("en-US", {
                              weekday: "long",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {w.workoutExercises.length} exercises · {totalSets} sets
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteClick(w.id)}
                          className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                          aria-label="Delete workout"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-500" />
                        )}
                      </button>

                      {expanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => router.push(`/log?edit=${w.id}`)}
                              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          </div>
                          {w.notes && (
                            <p className="text-xs text-zinc-400 italic bg-zinc-800/50 rounded-lg px-3 py-2">
                              {w.notes}
                            </p>
                          )}
                          {w.workoutExercises.map((we) => (
                            <div key={we.id}>
                              <p className="text-sm font-medium text-white mb-1">
                                {we.exercise.name}
                              </p>
                              <div className="flex gap-2 flex-wrap">
                                {we.sets.length === 1 && we.sets[0].durationSeconds ? (
                                  <span className="text-xs bg-zinc-800 text-zinc-300 rounded-md px-2 py-1">
                                    {fmtDuration(we.sets[0].durationSeconds)}
                                  </span>
                                ) : (
                                  we.sets.map((s) => (
                                    <span
                                      key={s.id}
                                      className="text-xs bg-zinc-800 text-zinc-300 rounded-md px-2 py-1"
                                    >
                                      {s.reps}{s.weightKg ? ` × ${s.weightKg}kg` : " reps"}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full mt-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-50 text-zinc-400 rounded-xl py-3 text-sm transition-colors"
        >
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      )}

      {undoTarget && (
        <UndoToast label="Workout deleted" onUndo={handleUndo} />
      )}
    </div>
  );
}
