"use client";

import { useState, useEffect, useRef } from "react";
import { Timer, X } from "lucide-react";
import { REST_PRESETS, REP_PRESETS } from "@/lib/constants";

interface SetInputProps {
  category: string;
  onAdd: (reps: number, weight: number | null) => void;
  onLogCardio: (seconds: number) => void;
  previousWeight?: number | null;
}

export default function SetInput({ category, onAdd, onLogCardio, previousWeight }: SetInputProps) {
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [showWeight, setShowWeight] = useState(true);
  const [restSeconds, setRestSeconds] = useState(90);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const timerId = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquireWakeLock = async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    if (wakeLockRef.current) return;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        if (wakeLockRef.current === sentinel) wakeLockRef.current = null;
      });
    } catch {
      // Silently ignore — wake-lock is best-effort.
    }
  };

  const releaseWakeLock = () => {
    const sentinel = wakeLockRef.current;
    if (!sentinel) return;
    wakeLockRef.current = null;
    sentinel.release().catch(() => {});
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (previousWeight != null) setWeight(String(previousWeight));
  }, [previousWeight]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timerId.current) { clearInterval(timerId.current); timerId.current = null; }
      releaseWakeLock();
      return;
    }
    acquireWakeLock();
    timerId.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) { clearInterval(timerId.current!); timerId.current = null; return null; }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerId.current) { clearInterval(timerId.current); timerId.current = null; }
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft === null]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && timeLeft !== null && timeLeft > 0) {
        acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft === null]);

  const stepWeight = (delta: number) => {
    const parsed = weight.trim() === "" ? NaN : parseFloat(weight);
    const base = Number.isFinite(parsed) ? parsed : (previousWeight ?? 0);
    setWeight(String(base + delta));
  };

  const startTimer = () => setTimeLeft(restSeconds);
  const cancelTimer = () => { if (timerId.current) { clearInterval(timerId.current); timerId.current = null; } setTimeLeft(null); };

  const commitSet = (r: number, w: number | null) => {
    onAdd(r, w);
    setReps("");
    startTimer();
  };

  const handleAdd = () => {
    const r = parseInt(reps);
    if (!r || r < 1) return;
    commitSet(r, weight ? parseFloat(weight) : null);
  };

  const addFromPreset = (r: number) => {
    setReps(String(r));
  };

  const handleLogCardio = () => {
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    const total = m * 60 + s;
    if (total < 1) return;
    onLogCardio(total);
    setMinutes("");
    setSeconds("");
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (category === "cardio") {
    return (
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <div className="flex gap-3 items-end mb-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1">Minutes</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-white text-xl text-center focus:outline-none focus:border-emerald-400"
              onKeyDown={(e) => e.key === "Enter" && handleLogCardio()}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1">Seconds</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-white text-xl text-center focus:outline-none focus:border-emerald-400"
              onKeyDown={(e) => e.key === "Enter" && handleLogCardio()}
            />
          </div>
          <button
            onClick={handleLogCardio}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg px-6 py-3 text-lg transition-colors"
          >
            Log
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      {timeLeft !== null ? (
        <div className="mb-3 bg-zinc-800 rounded-xl p-3 flex items-center gap-3">
          <Timer className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-zinc-500 mb-1">Rest timer</div>
            <div className="w-full bg-zinc-700 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${(timeLeft / restSeconds) * 100}%` }}
              />
            </div>
          </div>
          <span className={`text-lg font-mono font-bold tabular-nums ${timeLeft <= 10 ? "text-red-400" : "text-emerald-400"}`}>
            {fmt(timeLeft)}
          </span>
          <button onClick={cancelTimer} className="text-zinc-600 hover:text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-xs text-zinc-600">Rest</span>
          <div className="flex gap-1 ml-auto">
            {REST_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => setRestSeconds(s)}
                className={`text-xs rounded px-2 py-0.5 transition-colors ${
                  restSeconds === s
                    ? "bg-zinc-700 text-zinc-300"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 items-end mb-3">
        <div className="w-14 shrink-0">
          <label className="text-xs text-zinc-500 block mb-1">Reps</label>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="0"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-white text-xl text-center focus:outline-none focus:border-emerald-400"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        {showWeight && (
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1">Weight (kg)</label>
            <div className="flex gap-1">
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                className="flex-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-white text-xl text-center focus:outline-none focus:border-emerald-400"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              {previousWeight != null && (
                <div className="flex gap-1">
                  <button
                    onClick={() => stepWeight(-5)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg px-2.5 py-3 text-sm font-medium transition-colors"
                    title="5 kg less"
                  >
                    −5
                  </button>
                  <button
                    onClick={() => stepWeight(5)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg px-2.5 py-3 text-sm font-medium transition-colors"
                    title="5 kg more"
                  >
                    +5
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <button
          onClick={() => setShowWeight(!showWeight)}
          className={`text-xs px-2 py-3 transition-colors ${showWeight ? "text-zinc-400" : "text-zinc-700"}`}
          title={showWeight ? "Hide weight" : "Show weight"}
        >
          kg
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        {REP_PRESETS.map((r) => (
          <button
            key={r}
            onClick={() => addFromPreset(r)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg py-2 text-sm font-medium transition-colors"
          >
            {r}
          </button>
        ))}
      </div>

      <button
        onClick={handleAdd}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg py-3 text-lg transition-colors"
      >
        Add Set
      </button>
    </div>
  );
}
