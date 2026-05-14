"use client";

import type { WeeklySetsSeries } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import SkeletonCard from "./SkeletonCard";

const SPARK_W = 120;
const SPARK_H = 24;

function Sparkline({ counts, color }: { counts: number[]; color: string }) {
  const display = [...counts].reverse();
  const max = Math.max(1, ...display);
  const n = display.length;
  const step = n > 1 ? SPARK_W / (n - 1) : 0;
  const points = display.map((v, i) => {
    const x = i * step;
    const y = SPARK_H - (v / max) * (SPARK_H - 2) - 1;
    return [x, y] as const;
  });
  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const [lx, ly] = points[points.length - 1];

  return (
    <svg width={SPARK_W} height={SPARK_H} className="overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2.5} fill={color} />
    </svg>
  );
}

export default function WeeklySetsChart({ data, loading }: { data: WeeklySetsSeries | null; loading: boolean }) {
  if (loading) return <SkeletonCard className="h-48" />;
  if (!data || data.series.length === 0) {
    return <p className="text-sm text-zinc-600 py-4 text-center">No data yet</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-600">Working sets per week, last {data.weeks} weeks</p>
      {data.series.map((row, i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const current = row.counts[0] ?? 0;
        return (
          <div key={row.muscleGroup} className="flex items-center gap-3 text-xs">
            <span className="w-24 text-zinc-400 truncate">{row.muscleGroup}</span>
            <Sparkline counts={row.counts} color={color} />
            <span className="ml-auto text-zinc-300 font-mono">{current}</span>
          </div>
        );
      })}
    </div>
  );
}
