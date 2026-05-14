"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import type { MuscleGroupVolume } from "@/lib/types";
import SkeletonCard from "./SkeletonCard";

const PIE_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#eab308", // yellow
  "#8b5cf6", // violet
  "#22c55e", // green
];
const OTHERS_COLOR_INDEX = 5;

export default function MuscleGroupChart({ data, loading }: { data: MuscleGroupVolume[]; loading: boolean }) {
  if (loading) return <SkeletonCard className="h-48" />;
  if (data.length === 0) return <p className="text-sm text-zinc-600 py-4 text-center">No data yet</p>;

  const total = data.reduce((s, d) => s + d.volume, 0);
  const top5 = data.slice(0, 5);
  const others = data.slice(5).reduce((s, d) => s + d.volume, 0);

  const pieData = top5.map((d) => ({ name: d.muscleGroup, value: Math.round(d.volume) }));
  if (data.length > 5) pieData.push({ name: "Others", value: Math.round(others) });

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }}
            formatter={(value: unknown) => `${(Number(value) / 1000).toFixed(1)}k kg`}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1 mt-2">
        {data.map((d, i) => {
          const colorIndex = i < 5 ? i : OTHERS_COLOR_INDEX;
          return (
            <div key={d.muscleGroup} className="flex items-center gap-2 text-xs">
              <span className="w-32 text-zinc-400 truncate">{d.muscleGroup}</span>
              <div className="flex-1 bg-zinc-800 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(d.volume / total) * 100}%`,
                    backgroundColor: PIE_COLORS[colorIndex],
                  }}
                />
              </div>
              <span className="w-20 text-right text-zinc-500 font-mono">
                {total > 0 ? `${((d.volume / total) * 100).toFixed(0)}%` : "0%"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
