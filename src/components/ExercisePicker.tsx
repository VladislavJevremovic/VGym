"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import type { Exercise } from "@/lib/types";

interface ExercisePickerProps {
  onSelect: (exercise: Exercise) => void;
  selectedId?: number | null;
}

let cachedExercises: Exercise[] | null = null;

const groupOrder = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Core", "Cardio"];
const listboxId = "exercise-listbox";

export default function ExercisePicker({ onSelect, selectedId }: ExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>(cachedExercises ?? []);
  const [search, setSearch] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

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
                {groupOrder.map((group) => {
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
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
