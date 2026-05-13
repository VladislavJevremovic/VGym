"use client";

import { useState, useEffect, useRef } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import type { Exercise } from "@/lib/types";
import { MUSCLE_GROUPS, CATEGORIES } from "@/lib/constants";
import UndoToast from "@/components/UndoToast";

interface Props {
  onClose: () => void;
  onCacheInvalidate: () => void;
}

export default function ManageExercisesModal({ onClose, onCacheInvalidate }: Props) {
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
  const dialogRef = useRef<HTMLDivElement>(null);

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchExercises(); }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [onClose]);

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
      onCacheInvalidate();
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
      onCacheInvalidate();
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
        onCacheInvalidate();
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
      onCacheInvalidate();
      setAllExercises((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12" role="dialog" aria-modal="true" aria-label="Manage exercises">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div ref={dialogRef} className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col overflow-hidden">
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
