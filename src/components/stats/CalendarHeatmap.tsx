"use client";

import type { CalendarDay } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import SkeletonCard from "./SkeletonCard";

export default function CalendarHeatmap({ data, loading }: { data: CalendarDay[]; loading: boolean }) {
  if (loading) return <SkeletonCard className="h-40" />;
  if (data.length === 0) return <p className="text-sm text-zinc-600 py-4 text-center">No workouts yet</p>;

  const dateMap = new Map(data.map((d) => [d.date, d.workoutCount]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const firstMonday = new Date(thisMonday);
  firstMonday.setDate(firstMonday.getDate() - 52 * 7);

  const todayStr = formatDate(today);

  const weeks: { date: string; count: number }[][] = [];
  for (let w = 0; w < 53; w++) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(firstMonday);
      dt.setDate(firstMonday.getDate() + w * 7 + d);
      const dateStr = formatDate(dt);
      const count = dateStr > todayStr ? -1 : (dateMap.get(dateStr) ?? 0);
      week.push({ date: dateStr, count });
    }
    weeks.push(week);
  }

  const getColor = (count: number) => {
    if (count === -1) return "bg-transparent";
    if (count === 0) return "bg-zinc-800";
    if (count === 1) return "bg-emerald-900";
    if (count === 2) return "bg-emerald-700";
    return "bg-emerald-500";
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthLabels: { index: number; label: string }[] = [];
  for (let w = 0; w < weeks.length; w++) {
    const dt = new Date(weeks[w][0].date + "T00:00:00");
    const m = dt.getMonth();
    if (w === 0 || new Date(weeks[w - 1][0].date + "T00:00:00").getMonth() !== m) {
      monthLabels.push({ index: w, label: months[m] });
    }
  }

  const CELL = 14;

  return (
    <div className="overflow-x-auto">
      <div className="relative text-xs text-zinc-600 h-5" style={{ marginLeft: "28px" }}>
        {monthLabels.map((m) => (
          <span key={m.index} className="absolute top-0" style={{ left: `${m.index * CELL}px` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex gap-0.5">
        <div className="flex flex-col gap-0.5 mr-1 text-xs text-zinc-600 py-0.5">
          <span className="h-3 leading-3">Mon</span>
          <span className="h-3 leading-3" />
          <span className="h-3 leading-3">Wed</span>
          <span className="h-3 leading-3" />
          <span className="h-3 leading-3">Fri</span>
          <span className="h-3 leading-3" />
          <span className="h-3 leading-3" />
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <div
                key={di}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
                title={day.count >= 0 ? `${day.date}: ${day.count} workout(s)` : ""}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
