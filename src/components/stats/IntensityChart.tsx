"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { IntensityBucket } from "@/lib/types";
import SkeletonCard from "./SkeletonCard";

export default function IntensityChart({ data, loading }: { data: IntensityBucket[]; loading: boolean }) {
  if (loading) return <SkeletonCard className="h-40" />;
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) return <p className="text-sm text-zinc-600 py-4 text-center">No set data</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
        <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }}
          labelStyle={{ color: "#a1a1aa" }}
        />
        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
