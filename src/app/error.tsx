"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-4 text-center">
      <p className="text-red-400 mb-2">Something went wrong</p>
      <p className="text-zinc-500 text-sm mb-4">{error.message}</p>
      <button onClick={reset} className="text-emerald-400 text-sm font-medium underline">
        Try again
      </button>
    </div>
  );
}
