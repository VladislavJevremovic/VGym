"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PRData } from "@/lib/types";
import SkeletonCard from "./SkeletonCard";

export default function PRSection({ data, loading }: { data: PRData[]; loading: boolean }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (loading) return <SkeletonCard className="h-40" />;
  if (data.length === 0 || data.every((pr) => !pr.maxWeight && !pr.maxReps && !pr.bestE1rm && !pr.maxVolume)) {
    return <p className="text-sm text-zinc-600 py-4 text-center">No personal records yet</p>;
  }

  const hasPR = data.filter((pr) => pr.maxWeight || pr.maxReps || pr.bestE1rm || pr.maxVolume);
  if (hasPR.length === 0) return <p className="text-sm text-zinc-600 py-4 text-center">No personal records yet</p>;

  const isRecent = (date: string) => {
    const diff = (new Date().getTime() - new Date(date + "T00:00:00").getTime()) / 86400000;
    return diff <= 30;
  };

  return (
    <div className="space-y-2">
      {hasPR.map((pr) => (
        <div key={pr.exerciseId} className="bg-zinc-900/50 rounded-lg border border-zinc-800">
          <button
            onClick={() => setExpandedId(expandedId === pr.exerciseId ? null : pr.exerciseId)}
            aria-expanded={expandedId === pr.exerciseId}
            className="w-full flex items-center gap-2 px-3 py-2 text-left"
          >
            <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${expandedId === pr.exerciseId ? "rotate-0" : "-rotate-90"}`} />
            <span className="text-sm text-white font-medium">{pr.name}</span>
            <span className="text-xs text-zinc-500">{pr.muscleGroup}</span>
          </button>
          {expandedId === pr.exerciseId && (
            <div className="px-3 pb-3 grid grid-cols-2 gap-2">
              {pr.maxWeight && (
                <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800/50">
                  <p className="text-xs text-zinc-500">Max Weight</p>
                  <p className="text-sm text-white font-mono">{pr.maxWeight.value} kg × {pr.maxWeight.reps}{isRecent(pr.maxWeight.date) && " 🔥"}</p>
                  <p className="text-xs text-zinc-600">{new Date(pr.maxWeight.date + "T00:00:00").toLocaleDateString()}</p>
                </div>
              )}
              {pr.maxReps && (
                <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800/50">
                  <p className="text-xs text-zinc-500">Max Reps</p>
                  <p className="text-sm text-white font-mono">{pr.maxReps.value} @ {pr.maxReps.weight} kg{isRecent(pr.maxReps.date) && " 🔥"}</p>
                  <p className="text-xs text-zinc-600">{new Date(pr.maxReps.date + "T00:00:00").toLocaleDateString()}</p>
                </div>
              )}
              {pr.bestE1rm && (
                <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800/50">
                  <p className="text-xs text-zinc-500">Best e1RM</p>
                  <p className="text-sm text-emerald-400 font-mono">{pr.bestE1rm.value} kg{isRecent(pr.bestE1rm.date) && " 🔥"}</p>
                  <p className="text-xs text-zinc-600">{new Date(pr.bestE1rm.date + "T00:00:00").toLocaleDateString()}</p>
                </div>
              )}
              {pr.maxVolume && (
                <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800/50">
                  <p className="text-xs text-zinc-500">Max Volume</p>
                  <p className="text-sm text-white font-mono">{pr.maxVolume.value} kg{isRecent(pr.maxVolume.date) && " 🔥"}</p>
                  <p className="text-xs text-zinc-600">{new Date(pr.maxVolume.date + "T00:00:00").toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
