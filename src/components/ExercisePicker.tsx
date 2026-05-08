"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import type { Exercise } from "@/lib/types";
import { MUSCLE_GROUPS, CATEGORIES } from "@/lib/constants";
import UndoToast from "@/components/UndoToast";

interface ExercisePickerProps {
  onSelect: (exercise: Exercise) => void;
  selectedId?: number | null;
}

let cachedExercises: Exercise[] | null = null;

const listboxId = "exercise-listbox";

function ManageExercisesModal({ onClose }: { onClose: () => void }) {
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("Chest");
  const [category, setCategory] = useState("dumbbell");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editMuscleGroup, setEditMuscleGroup] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [undoTarget, setUndoTarget] = useState<Exercise | null>(null);

  const fetchExercises = async () => {
    try {
      const res = await fetch("/api/exercises");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setAllExercises(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/exercises");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setAllExercises(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), muscleGroup, category }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      setName("");
      setMuscleGroup("Chest");
      setCategory("dumbbell");
      await fetchExercises();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setEditName(ex.name);
    setEditMuscleGroup(ex.muscleGroup);
    setEditCategory(ex.category);
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) { setError("Name is required"); return; }
    setError("");
    try {
      const res = await fetch(`/api/exercises/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), muscleGroup: editMuscleGroup, category: editCategory }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setEditingId(null);
      await fetchExercises();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    if (!undoTarget) return;
    const timer = setTimeout(() => setUndoTarget(null), 5000);
    return () => clearTimeout(timer);
  }, [undoTarget]);

  const handleDelete = (ex: Exercise) => {
    setError("");
    setAllExercises((prev) => prev.filter((e) => e.id !== ex.id));
    setUndoTarget(ex);
    fetch(`/api/exercises/${ex.id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) {
          res.json().then((data) => {
            setError(data.error || "Failed to delete");
            setAllExercises((prev) => [...prev, ex].sort((a, b) => a.name.localeCompare(b.name)));
            setUndoTarget(null);
          });
          return;
        }
        cachedExercises = null;
      })
      .catch(() => {
        setAllExercises((prev) => [...prev, ex].sort((a, b) => a.name.localeCompare(b.name)));
        setUndoTarget(null);
      });
  };

  const handleUndoDelete = async (ex: Exercise) => {
    setUndoTarget(null);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ex.name, muscleGroup: ex.muscleGroup, category: ex.category }),
      });
      if (!res.ok) throw new Error("Failed to restore");
      const created = await res.json();
      cachedExercises = null;
      setAllExercises((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-white">Manage Exercises</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">Add new exercise</p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise name"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400"
            />
            <div className="flex gap-2">
              <select
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
              >
                {MUSCLE_GROUPS.map((mg) => (
                  <option key={mg} value={mg}>{mg}</option>
                ))}
              </select>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-sm font-bold rounded-lg py-2 transition-colors"
            >
              {saving ? "Adding..." : "Add Exercise"}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {allExercises.map((ex) => (
                <div key={ex.id} className="bg-zinc-800/50 rounded-lg border border-zinc-800 px-3 py-2">
                  {editingId === ex.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-400"
                      />
                      <div className="flex gap-2">
                        <select
                          value={editMuscleGroup}
                          onChange={(e) => setEditMuscleGroup(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-400"
                        >
                          {MUSCLE_GROUPS.map((mg) => (
                            <option key={mg} value={mg}>{mg}</option>
                          ))}
                        </select>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-400"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="text-xs text-zinc-500 hover:text-white px-2 py-1">
                          Cancel
                        </button>
                        <button onClick={() => saveEdit(ex.id)} className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-white">{ex.name}</span>
                      <span className="text-xs text-zinc-500">{ex.muscleGroup}</span>
                      <span className="text-xs text-zinc-600 bg-zinc-900 rounded px-1.5 py-0.5">{ex.category}</span>
                      <button onClick={() => startEdit(ex)} className="text-zinc-500 hover:text-emerald-400 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(ex)} className="text-zinc-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {undoTarget && (
          <UndoToast label="Exercise deleted" onUndo={() => handleUndoDelete(undoTarget)} />
        )}
      </div>
    </div>
  );
}

export default function ExercisePicker({ onSelect, selectedId }: ExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>(cachedExercises ?? []);
  const [search, setSearch] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    if (cachedExercises) return;
    fetch("/api/exercises")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load exercises");
        return r.json();
      })
      .then((data) => {
        cachedExercises = data;
        setExercises(data);
      })
      .catch(() => setExercises([]));
  }, []);

  const selectedExercise = exercises.find((e) => e.id === selectedId);

  const filtered = search
    ? exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : exercises;

  const grouped: Record<string, Exercise[]> = {};
  for (const ex of filtered) {
    if (!grouped[ex.muscleGroup]) grouped[ex.muscleGroup] = [];
    grouped[ex.muscleGroup].push(ex);
  }

  const visibleOptions = search
    ? filtered
    : expandedGroup
      ? (grouped[expandedGroup] || [])
      : [];

  const clampedIndex = Math.min(activeIndex, Math.max(0, visibleOptions.length - 1));

  const selectExercise = (ex: Exercise) => {
    onSelect(ex);
    setOpen(false);
    setSearch("");
    setActiveIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, visibleOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && visibleOptions[clampedIndex]) {
      e.preventDefault();
      selectExercise(visibleOptions[clampedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
      setActiveIndex(0);
    }
  };

  const optionId = (index: number) => `exercise-option-${index}`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select exercise"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-left text-white flex items-center gap-2 hover:border-zinc-700 transition-colors"
      >
        <Search className="w-4 h-4 text-zinc-500 shrink-0" />
        <span className={selectedExercise ? "text-white" : "text-zinc-500"}>
          {selectedExercise ? selectedExercise.name : "Select exercise..."}
        </span>
        <span className="ml-auto text-zinc-600 text-xs">
          {selectedExercise?.muscleGroup}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); setActiveIndex(0); }} />
          <div className="absolute top-full mt-2 left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-xl z-50 max-h-80 overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-zinc-900 p-3 border-b border-zinc-800">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setActiveIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search exercises..."
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-activedescendant={visibleOptions.length > 0 ? optionId(clampedIndex) : undefined}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                autoFocus
              />
            </div>

            {search ? (
              <div id={listboxId} role="listbox" className="p-2">
                {filtered.length === 0 && (
                  <p className="text-zinc-500 text-sm text-center py-4">No exercises found</p>
                )}
                {filtered.map((ex, i) => (
                  <button
                    key={ex.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={ex.id === selectedId}
                    onClick={() => selectExercise(ex)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      i === clampedIndex
                        ? "bg-zinc-800 text-white"
                        : ex.id === selectedId
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <span>{ex.name}</span>
                    <span className="text-zinc-600 text-xs ml-2">{ex.muscleGroup}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div id={listboxId} role="listbox" className="p-2">
                {MUSCLE_GROUPS.map((group) => {
                  const items = grouped[group];
                  if (!items?.length) return null;
                  const isExpanded = expandedGroup === group;
                  return (
                    <div key={group} role="presentation">
                      <button
                        onClick={() => setExpandedGroup(isExpanded ? null : group)}
                        role="presentation"
                        className="w-full text-left px-3 py-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2"
                      >
                        <span className={`text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}>›</span>
                        {group}
                        <span className="text-zinc-600 text-xs ml-auto">{items.length}</span>
                      </button>
                      {isExpanded &&
                        items.map((ex, i) => (
                          <button
                            key={ex.id}
                            id={optionId(i)}
                            role="option"
                            aria-selected={ex.id === selectedId}
                            onClick={() => selectExercise(ex)}
                            onMouseEnter={() => setActiveIndex(i)}
                            className={`w-full text-left pl-8 pr-3 py-2 rounded-lg text-sm transition-colors ${
                              i === clampedIndex
                                ? "bg-zinc-800 text-white"
                                : ex.id === selectedId
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "text-zinc-300 hover:bg-zinc-800"
                            }`}
                          >
                            {ex.name}
                          </button>
                        ))}
                    </div>
                  );
                })}

                <div className="border-t border-zinc-800 mt-2 pt-2">
                  <button
                    onClick={() => { setOpen(false); setShowManage(true); }}
                    className="w-full text-left px-3 py-2 text-sm text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Manage exercises
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showManage && <ManageExercisesModal onClose={() => setShowManage(false)} />}
    </div>
  );
}
