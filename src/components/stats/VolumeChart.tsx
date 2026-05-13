"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { VolumePoint } from "@/lib/types";
import SkeletonCard from "./SkeletonCard";

export default function VolumeChart() {
  const [periodType, setPeriodType] = useState<"weekly" | "monthly">("weekly");
  const [data, setData] = useState<VolumePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stats/volume?period=${periodType}&count=12`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [periodType]);

  if (loading) return <SkeletonCard className="h-48" />;
  if (data.length === 0) return <p className="text-sm text-zinc-600 py-4 text-center">No data yet</p>;

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setPeriodType("weekly")}
          className={`text-xs rounded-lg px-3 py-1.5 font-medium transition-colors ${
            periodType === "weekly"
              ? "bg-zinc-800 text-white border border-zinc-600"
              : "bg-zinc-900 text-zinc-500 border border-zinc-800"
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setPeriodType("monthly")}
          className={`text-xs rounded-lg px-3 py-1.5 font-medium transition-colors ${
            periodType === "monthly"
              ? "bg-zinc-800 text-white border border-zinc-600"
              : "bg-zinc-900 text-zinc-500 border border-zinc-800"
          }`}
        >
          Monthly
        </button>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="period" tick={{ fill: "#71717a", fontSize: 10 }} />
          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value: unknown) => `${(Number(value) / 1000).toFixed(1)}k kg`}
          />
          <Bar dataKey="totalVolume" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
