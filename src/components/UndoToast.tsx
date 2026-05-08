"use client";

import { RotateCcw } from "lucide-react";

interface UndoToastProps {
  label: string;
  onUndo: () => void;
}

export default function UndoToast({ label, onUndo }: UndoToastProps) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 flex items-center justify-between shadow-2xl max-w-lg mx-auto">
      <span className="text-sm text-zinc-200">{label}</span>
      <button onClick={onUndo} className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium ml-4 shrink-0">
        <RotateCcw className="w-3.5 h-3.5" />
        Undo
      </button>
    </div>
  );
}
