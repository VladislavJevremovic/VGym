"use client";

import { X } from "lucide-react";

interface SetRowProps {
  setNumber: number;
  reps: number;
  weightKg: number | null;
  durationSeconds: number | null;
  onDelete?: () => void;
  readonly?: boolean;
}

function fmtDuration(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function SetRow({ setNumber, reps, weightKg, durationSeconds, onDelete, readonly }: SetRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-zinc-900 rounded-lg border border-zinc-800">
      <span className="text-zinc-600 text-sm font-mono w-6">{setNumber}</span>
      {durationSeconds != null ? (
        <span className="flex-1 text-emerald-400 font-medium">{fmtDuration(durationSeconds)}</span>
      ) : (
        <>
          <span className="flex-1 text-white font-medium">{reps} reps</span>
          {weightKg != null && (
            <span className="text-emerald-400 font-medium">{weightKg} kg</span>
          )}
        </>
      )}
      {!readonly && onDelete && (
        <button onClick={onDelete} className="text-zinc-600 hover:text-red-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
