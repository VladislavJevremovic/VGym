"use client";

import { useState, useMemo } from "react";
import type { StrengthRow } from "@/lib/types";
import SkeletonCard from "./SkeletonCard";

type SortKey = "name" | "muscleGroup" | "e1rm" | "date";

export default function StrengthTable({ data, loading }: { data: StrengthRow[]; loading: boolean }) {
  const [sortKey, setSortKey] = useState<SortKey>("e1rm");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "e1rm") return (a.e1rm - b.e1rm) * dir;
      if (sortKey === "date") return a.date.localeCompare(b.date) * dir;
      return a[sortKey].localeCompare(b[sortKey]) * dir;
    });
  }, [data, sortKey, sortAsc]);

  if (loading) return <SkeletonCard className="h-40" />;
  if (data.length === 0) return <p className="text-sm text-zinc-600 py-4 text-center">No strength data</p>;

  const toggle = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "e1rm"); }
  };

  const headerClass = (key: SortKey) =>
    `text-xs text-zinc-500 pb-2 cursor-pointer hover:text-white transition-colors ${sortKey === key ? "text-emerald-400" : ""}`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className={headerClass("name")} onClick={() => toggle("name")}>Exercise</th>
            <th className={headerClass("muscleGroup")} onClick={() => toggle("muscleGroup")}>Group</th>
            <th className={`${headerClass("e1rm")} text-right`} onClick={() => toggle("e1rm")}>e1RM</th>
            <th className={`${headerClass("date")} text-right`} onClick={() => toggle("date")}>Date</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.exerciseId} className="border-b border-zinc-800/50">
              <td className="py-2 text-white">{row.name}</td>
              <td className="py-2 text-zinc-500">{row.muscleGroup}</td>
              <td className="py-2 text-emerald-400 text-right font-mono">{row.e1rm} kg</td>
              <td className="py-2 text-zinc-500 text-right">
                {new Date(row.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
