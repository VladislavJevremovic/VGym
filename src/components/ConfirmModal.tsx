"use client";

import { useEffect, useRef } from "react";

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Confirmation">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl mx-4 p-6 max-w-sm w-full">
        <p className="text-sm text-white mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors rounded-lg border border-zinc-700 hover:border-zinc-600"
          >
            Stay
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors rounded-lg border border-red-500/30"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
