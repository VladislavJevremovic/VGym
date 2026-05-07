"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, X, Search, Check, Pencil, Trash2, RotateCcw } from "lucide-react";
import type { Exercise, Routine } from "@/lib/types";

const groupOrder = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Core", "Cardio"];

function RoutineForm({
  onDone,
  onCancel,
  initial,
}: {
  onDone: (routine: Routine) => void;
  onCancel: () => void;
  initial?: Routine | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<number[]>(
    initial?.exercises.map((re) => re.exercise?.id).filter((id): id is number => !!id) ?? []
  );
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load exercises");
        return r.json();
      })
      .then(setExercises)
      .catch((e: Error) => setError(e.message));
  }, []);

  const filtered = search
    ? exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : exercises;

  const grouped: Record<string, Exercise[]> = {};
  for (const ex of filtered) {
    if (!grouped[ex.muscleGroup]) grouped[ex.muscleGroup] = [];
    grouped[ex.muscleGroup].push(ex);
  }

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (selected.length === 0) { setError("Select at least one exercise"); return; }
    setSaving(true);
    setError("");
    try {
      if (initial) {
        const res = await fetch(`/api/routines/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), exerciseIds: selected }),
        });
        if (!res.ok) throw new Error("Failed to update routine");
        const routinesRes = await fetch("/api/routines");
        const allRoutines: Routine[] = await routinesRes.json();
        const updated = allRoutines.find((r) => r.id === initial.id);
        if (updated) onDone(updated);
      } else {
        const res = await fetch("/api/routines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), exerciseIds: selected }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create routine");
        }
        const routinesRes = await fetch("/api/routines");
        const allRoutines: Routine[] = await routinesRes.json();
        const created = allRoutines.find((r) => r.name === name.trim());
        if (created) onDone(created);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save routine");
      setSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">
          {initial ? "Edit Routine" : "New Routine"}
        </h2>
        <button onClick={onCancel} className="text-zinc-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Routine name..."
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 mb-3"
        autoFocus
      />

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg mb-3 max-h-64 overflow-y-auto">
        <div className="sticky top-0 bg-zinc-800 p-2 border-b border-zinc-700">
          <div className="flex items-center gap-2 bg-zinc-900 rounded-md px-2 py-1.5">
            <Search className="w-3 h-3 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="bg-transparent text-xs text-white focus:outline-none w-full"
            />
          </div>
        </div>
        <div className="p-2">
          {groupOrder.map((group) => {
            const items = grouped[group];
            if (!items?.length) return null;
            return (
              <div key={group}>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 py-1">{group}</p>
                {items.map((ex) => {
                  const isSelected = selected.includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => toggle(ex.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                        isSelected ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-black" />}
                      </span>
                      {ex.name}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-zinc-500 mb-3">{selected.length} exercise{selected.length > 1 ? "s" : ""} selected</p>
      )}

      {error && (
        <p className="text-red-400 text-xs mb-3">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-semibold rounded-lg py-2.5 text-sm transition-colors"
      >
        {saving ? "Saving..." : (initial ? "Save Changes" : "Create Routine")}
      </button>
    </div>
  );
}

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletedRoutine, setDeletedRoutine] = useState<Routine | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/routines")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load routines");
        return r.json();
      })
      .then((data) => {
        setRoutines(data);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!deletedRoutine) return;
    const id = setTimeout(() => setDeletedRoutine(null), 5000);
    return () => clearTimeout(id);
  }, [deletedRoutine]);

  const handleCreated = (routine: Routine) => {
    setRoutines((prev) => [...prev, routine].sort((a, b) => a.name.localeCompare(b.name)));
    setCreating(false);
  };

  const handleUpdated = (routine: Routine) => {
    setRoutines((prev) => prev.map((r) => (r.id === routine.id ? routine : r)).sort((a, b) => a.name.localeCompare(b.name)));
    setEditingId(null);
  };

  const handleDeleteClick = async (id: number) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    setDeletedRoutine(routine);
    try {
      const res = await fetch(`/api/routines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete routine");
    } catch {
      setRoutines((prev) => [...prev, routine].sort((a, b) => a.name.localeCompare(b.name)));
      setDeletedRoutine(null);
    }
  };

  const handleUndoDelete = async () => {
    const target = deletedRoutine;
    if (!target) return;
    setDeletedRoutine(null);
    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: target.name,
          exerciseIds: target.exercises.map((re) => re.exercise?.id).filter((id): id is number => !!id),
        }),
      });
      if (!res.ok) throw new Error("Failed to restore routine");
      const routinesRes = await fetch("/api/routines");
      const allRoutines: Routine[] = await routinesRes.json();
      const restored = allRoutines.find((r) => r.name === target.name);
      if (restored) {
        setRoutines((prev) => [...prev, restored].sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch {
      setError("Failed to restore routine");
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Routines</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-zinc-900 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Routines</h1>
        {!creating && editingId === null && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {creating && (
        <RoutineForm
          onDone={handleCreated}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="space-y-3">
        {routines.map((routine) => {
          if (editingId === routine.id) {
            return (
              <RoutineForm
                key={routine.id}
                initial={routine}
                onDone={handleUpdated}
                onCancel={() => setEditingId(null)}
              />
            );
          }
          return (
            <div
              key={routine.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => router.push(`/routines/${routine.id}`)}
                className="w-full p-4 text-left hover:bg-zinc-800/50 transition-colors group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{routine.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">
                      {routine.exercises.length} exercises
                    </span>
                    <Play className="w-4 h-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {routine.exercises.slice(0, 4).map((re) => (
                    <span
                      key={re.id}
                      className="text-xs bg-zinc-800 text-zinc-400 rounded-md px-2 py-1"
                    >
                      {re.exercise?.name}
                    </span>
                  ))}
                  {routine.exercises.length > 4 && (
                    <span className="text-xs bg-zinc-800 text-zinc-500 rounded-md px-2 py-1">
                      +{routine.exercises.length - 4} more
                    </span>
                  )}
                </div>
              </button>
              <div className="flex border-t border-zinc-800">
                <button
                  onClick={() => setEditingId(routine.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800/50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <div className="w-px bg-zinc-800" />
                <button
                  onClick={() => handleDeleteClick(routine.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {routines.length === 0 && !creating && (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-lg mb-2">No routines yet</p>
            <p className="text-zinc-600 text-sm">Tap New to create your first routine</p>
          </div>
        )}
      </div>

      {deletedRoutine && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 flex items-center justify-between shadow-2xl max-w-lg mx-auto">
          <span className="text-sm text-zinc-200">Routine deleted</span>
          <button onClick={handleUndoDelete} className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium ml-4 shrink-0">
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
