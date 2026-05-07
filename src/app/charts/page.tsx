"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ExercisePicker from "@/components/ExercisePicker";
import type { Exercise, StatsDataPoint } from "@/lib/types";

type Metric = "e1rm" | "maxWeight" | "volume" | "reps" | "maxReps";

const metrics: { key: Metric; label: string; color: string }[] = [
  { key: "e1rm", label: "Est. 1RM", color: "#0f0" },
  { key: "maxWeight", label: "Max Weight", color: "#38bdf8" },
  { key: "volume", label: "Volume", color: "#f472b6" },
  { key: "reps", label: "Total Reps", color: "#a78bfa" },
  { key: "maxReps", label: "Max Reps", color: "#34d399" },
];

export default function ChartsPage() {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [data, setData] = useState<StatsDataPoint[]>([]);
  const [metric, setMetric] = useState<Metric>("e1rm");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSelect = async (ex: Exercise) => {
    setExercise(ex);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stats/${ex.id}?days=180`);
      if (!res.ok) throw new Error("Failed to load stats");
      const points = await res.json();
      setData(points);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const currentMetric = metrics.find((m) => m.key === metric)!;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Charts</h1>

      <ExercisePicker onSelect={handleSelect} selectedId={exercise?.id} />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm mt-4">
          {error}
        </div>
      )}

      {exercise && (
        <div className="mt-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {metrics.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`text-xs rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  m.key === metric
                    ? "bg-zinc-800 text-white border border-zinc-600"
                    : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setChartType("line")}
              className={`text-xs rounded-lg px-3 py-1.5 font-medium transition-colors ${
                chartType === "line"
                  ? "bg-zinc-800 text-white border border-zinc-600"
                  : "bg-zinc-900 text-zinc-500 border border-zinc-800"
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`text-xs rounded-lg px-3 py-1.5 font-medium transition-colors ${
                chartType === "bar"
                  ? "bg-zinc-800 text-white border border-zinc-600"
                  : "bg-zinc-900 text-zinc-500 border border-zinc-800"
              }`}
            >
              Bar
            </button>
          </div>

          {loading ? (
            <div className="bg-zinc-900 rounded-xl h-64 animate-pulse" />
          ) : data.length === 0 ? (
            <div className="bg-zinc-900 rounded-xl p-8 text-center">
              <p className="text-zinc-500">No data yet for {exercise.name}</p>
              <p className="text-zinc-600 text-sm mt-1">Log some workouts first</p>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <h3 className="text-sm font-semibold text-white mb-4">
                {exercise.name} — {currentMetric.label}
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                {chartType === "line" ? (
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      tickFormatter={(d: string) => {
                        const parts = d.split("-");
                        return `${parts[1]}/${parts[2]}`;
                      }}
                    />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Line
                      type="monotone"
                      dataKey={metric}
                      stroke={currentMetric.color}
                      strokeWidth={2}
                      dot={{ fill: currentMetric.color, r: 4 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      tickFormatter={(d: string) => {
                        const parts = d.split("-");
                        return `${parts[1]}/${parts[2]}`;
                      }}
                    />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Bar dataKey={metric} fill={currentMetric.color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
