"use client";

import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { useState } from "react";
import { getErrorMessage } from "@/lib/utils";

export default function SetupPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const check = await fetch("/api/auth/check");
      if (!check.ok) throw new Error("Could not reach server");
      const { pinSet } = await check.json();

      const url = pinSet ? "/api/auth/login" : "/api/auth/setup";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        router.push("/log");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong");
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
      <div className="w-full max-w-sm text-center">
        <Dumbbell className="w-16 h-16 mx-auto text-emerald-400 mb-4" />
        <h1 className="text-3xl font-bold mb-2">VGym</h1>
        <p className="text-zinc-400 mb-8">Enter your PIN to continue</p>

        <input
          type="password"
          inputMode="numeric"
          maxLength={16}
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full text-center text-3xl tracking-widest bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-emerald-400 mb-4"
          placeholder="••••"
          autoFocus
        />

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-semibold rounded-xl py-4 text-lg transition-colors"
        >
          {loading ? "Checking..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
