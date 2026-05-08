"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import ExercisePicker from "@/components/ExercisePicker";
import ErrorBanner from "@/components/ErrorBanner";
import type {
  Exercise, StatsDataPoint, SummaryData, CalendarDay,
  MuscleGroupVolume, StrengthRow, IntensityBucket, PRData, VolumePoint,
} from "@/lib/types";
import { formatDisplayDate, getErrorMessage, formatDate } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const PIE_COLORS = [
  "#10b981", "#22c55e", "#34d399", "#6ee7b7",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a78bfa",
  "#f59e0b", "#f97316", "#ef4444", "#ec4899",
  "#14b8a6", "#06b6d4",
];

type Metric = "e1rm" | "maxWeight" | "volume" | "reps" | "maxReps";
const chartMetrics: { key: Metric; label: string; color: string }[] = [
  { key: "e1rm", label: "Est. 1RM", color: "#0f0" },
  { key: "maxWeight", label: "Max Weight", color: "#38bdf8" },
  { key: "volume", label: "Volume", color: "#f472b6" },
  { key: "reps", label: "Total Reps", color: "#a78bfa" },
  { key: "maxReps", label: "Max Reps", color: "#34d399" },
];

function AccordionSection({
  title, count, defaultOpen, children,
}: {
  title: string;
  count?: number | string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
        <span className="text-sm font-semibold text-white">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-zinc-500 ml-1">({count})</span>
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`bg-zinc-900 rounded-xl animate-pulse ${className}`} />;
}

function SummaryCards({ data }: { data: SummaryData | null }) {
  if (!data) return null;
  const cards = [
    { label: "Total Workouts", value: data.totalWorkouts },
    { label: "Total Volume", value: `${(data.totalVolume / 1000).toFixed(1)}k kg` },
    { label: "Current Streak", value: data.currentStreak > 0 ? `${data.currentStreak} 🔥` : "0" },
    { label: "Days This Week", value: `${data.daysThisWeek}/7` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <p className="text-xs text-zinc-500 mb-1">{c.label}</p>
          <p className="text-xl font-bold text-white">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function CalendarHeatmap({ data, loading }: { data: CalendarDay[]; loading: boolean }) {
  if (loading) return <SkeletonCard className="h-40" />;
  if (data.length === 0) return <p className="text-sm text-zinc-600 py-4 text-center">No workouts yet</p>;

  const dateMap = new Map(data.map((d) => [d.date, d.workoutCount]));
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);

  const days: { date: Date; count: number }[] = [];
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const str = formatDate(d);
    days.push({ date: new Date(d), count: dateMap.get(str) ?? 0 });
  }

  const weeks: { date: Date; count: number }[][] = [];
  let week: typeof days = [];
  for (const day of days) {
    week.push(day);
    if (week.length === 7 || day.date.getTime() === today.getTime()) {
      weeks.push(week);
      week = [];
    }
  }

  const getColor = (count: number) => {
    if (count === 0) return "bg-zinc-800";
    if (count === 1) return "bg-emerald-900";
    if (count === 2) return "bg-emerald-700";
    return "bg-emerald-500";
  };

  const monthLabels: { index: number; label: string }[] = [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 0; i < weeks.length; i++) {
    const m = weeks[i][0]?.date.getMonth();
    if (m !== undefined && (i === 0 || weeks[i - 1][0]?.date.getMonth() !== m)) {
      monthLabels.push({ index: i, label: months[m] });
    }
  }

  const dayLabels = ["Mon", "Wed", "Fri"];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 text-xs text-zinc-600 mb-1" style={{ paddingLeft: "2rem" }}>
        {monthLabels.map((m) => (
          <span key={m.index} style={{ marginLeft: m.index === 0 ? 0 : `${(m.index - (monthLabels.find((p) => monthLabels.indexOf(p) < monthLabels.indexOf(m))?.index ?? 0)) * 12}px` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex gap-0.5">
        <div className="flex flex-col gap-0.5 mr-1 text-xs text-zinc-600 justify-around py-0.5">
          {dayLabels.map((d) => (
            <span key={d} className="h-3 leading-3">{d}</span>
          ))}
        </div>
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {[...Array(7)].map((_, di) => {
              const day = w.find((d) => d.date.getDay() === (di + 1) % 7);
              return (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-sm ${day ? getColor(day.count) : "bg-transparent"}`}
                  title={day ? `${formatDate(day.date)}: ${day.count} workout(s)` : ""}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

type SortKey = "name" | "muscleGroup" | "e1rm" | "date";
function StrengthTable({ data, loading }: { data: StrengthRow[]; loading: boolean }) {
  const [sortKey, setSortKey] = useState<SortKey>("e1rm");
  const [sortAsc, setSortAsc] = useState(false);

  if (loading) return <SkeletonCard className="h-40" />;
  if (data.length === 0) return <p className="text-sm text-zinc-600 py-4 text-center">No strength data</p>;

  const sorted = [...data].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "e1rm") return (a.e1rm - b.e1rm) * dir;
    if (sortKey === "date") return a.date.localeCompare(b.date) * dir;
    return a[sortKey].localeCompare(b[sortKey]) * dir;
  });

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

function IntensityChart({ data, loading }: { data: IntensityBucket[]; loading: boolean }) {
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

function MuscleGroupChart({ data, loading }: { data: MuscleGroupVolume[]; loading: boolean }) {
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
        {data.map((d) => (
          <div key={d.muscleGroup} className="flex items-center gap-2 text-xs">
            <span className="w-32 text-zinc-400 truncate">{d.muscleGroup}</span>
            <div className="flex-1 bg-zinc-800 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${(d.volume / total) * 100}%` }}
              />
            </div>
            <span className="w-20 text-right text-zinc-500 font-mono">
              {total > 0 ? `${((d.volume / total) * 100).toFixed(0)}%` : "0%"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VolumeChart({ data, loading }: { data: VolumePoint[]; loading: boolean }) {
  const [periodType, setPeriodType] = useState<"weekly" | "monthly">("weekly");

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

function PerExerciseChart() {
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
      setError(getErrorMessage(e));
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const currentMetric = chartMetrics.find((m) => m.key === metric)!;

  return (
    <div>
      <ExercisePicker onSelect={handleSelect} selectedId={exercise?.id} />
      <div className="mt-3"><ErrorBanner message={error} /></div>
      {exercise && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {chartMetrics.map((m) => (
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
            <SkeletonCard className="h-64" />
          ) : data.length === 0 ? (
            <div className="bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
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
                    <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={formatDisplayDate} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} labelStyle={{ color: "#a1a1aa" }} />
                    <Line type="monotone" dataKey={metric} stroke={currentMetric.color} strokeWidth={2} dot={{ fill: currentMetric.color, r: 4 }} />
                  </LineChart>
                ) : (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={formatDisplayDate} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} labelStyle={{ color: "#a1a1aa" }} />
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

function PRSection({ data, loading }: { data: PRData[]; loading: boolean }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (loading) return <SkeletonCard className="h-40" />;
  if (data.length === 0 || data.every((pr) => !pr.maxWeight && !pr.maxReps && !pr.bestE1rm && !pr.maxVolume)) {
    return <p className="text-sm text-zinc-600 py-4 text-center">No personal records yet</p>;
  }

  const hasPR = data.filter((pr) => pr.maxWeight || pr.maxReps || pr.bestE1rm || pr.maxVolume);
  if (hasPR.length === 0) return <p className="text-sm text-zinc-600 py-4 text-center">No personal records yet</p>;

  const isRecent = (date: string) => {
    const diff = (new Date().getTime() - new Date(date + "T00:00:00").getTime()) / 86400000;
    return diff <= 30;
  };

  return (
    <div className="space-y-2">
      {hasPR.map((pr) => (
        <div key={pr.exerciseId} className="bg-zinc-900/50 rounded-lg border border-zinc-800">
          <button
            onClick={() => setExpandedId(expandedId === pr.exerciseId ? null : pr.exerciseId)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left"
          >
            <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${expandedId === pr.exerciseId ? "rotate-0" : "-rotate-90"}`} />
            <span className="text-sm text-white font-medium">{pr.name}</span>
            <span className="text-xs text-zinc-500">{pr.muscleGroup}</span>
          </button>
          {expandedId === pr.exerciseId && (
            <div className="px-3 pb-3 grid grid-cols-2 gap-2">
              {pr.maxWeight && (
                <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800/50">
                  <p className="text-xs text-zinc-500">Max Weight</p>
                  <p className="text-sm text-white font-mono">{pr.maxWeight.value} kg × {pr.maxWeight.reps}{isRecent(pr.maxWeight.date) && " 🔥"}</p>
                  <p className="text-xs text-zinc-600">{new Date(pr.maxWeight.date + "T00:00:00").toLocaleDateString()}</p>
                </div>
              )}
              {pr.maxReps && (
                <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800/50">
                  <p className="text-xs text-zinc-500">Max Reps</p>
                  <p className="text-sm text-white font-mono">{pr.maxReps.value} @ {pr.maxReps.weight} kg{isRecent(pr.maxReps.date) && " 🔥"}</p>
                  <p className="text-xs text-zinc-600">{new Date(pr.maxReps.date + "T00:00:00").toLocaleDateString()}</p>
                </div>
              )}
              {pr.bestE1rm && (
                <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800/50">
                  <p className="text-xs text-zinc-500">Best e1RM</p>
                  <p className="text-sm text-emerald-400 font-mono">{pr.bestE1rm.value} kg{isRecent(pr.bestE1rm.date) && " 🔥"}</p>
                  <p className="text-xs text-zinc-600">{new Date(pr.bestE1rm.date + "T00:00:00").toLocaleDateString()}</p>
                </div>
              )}
              {pr.maxVolume && (
                <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800/50">
                  <p className="text-xs text-zinc-500">Max Volume</p>
                  <p className="text-sm text-white font-mono">{pr.maxVolume.value} kg{isRecent(pr.maxVolume.date) && " 🔥"}</p>
                  <p className="text-xs text-zinc-600">{new Date(pr.maxVolume.date + "T00:00:00").toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [volume, setVolume] = useState<VolumePoint[]>([]);
  const [volumeLoading, setVolumeLoading] = useState(true);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupVolume[]>([]);
  const [mgLoading, setMgLoading] = useState(true);
  const [strength, setStrength] = useState<StrengthRow[]>([]);
  const [strengthLoading, setStrengthLoading] = useState(true);
  const [intensity, setIntensity] = useState<IntensityBucket[]>([]);
  const [intensityLoading, setIntensityLoading] = useState(true);
  const [prs, setPrs] = useState<PRData[]>([]);
  const [prsLoading, setPrsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchJson = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json();
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [s, c, v, mg, st, i, p] = await Promise.all([
          fetchJson("/api/stats/summary"),
          fetchJson("/api/stats/calendar?months=12"),
          fetchJson("/api/stats/volume?period=weekly&count=12"),
          fetchJson("/api/stats/muscle-groups?days=90"),
          fetchJson("/api/stats/strength-table?days=90"),
          fetchJson("/api/stats/intensity?days=90"),
          fetchJson("/api/stats/prs"),
        ]);
        setSummary(s);
        setCalendar(c);
        setVolume(v);
        setMuscleGroups(mg);
        setStrength(st);
        setIntensity(i);
        setPrs(p);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      } finally {
        setSummaryLoading(false);
        setCalendarLoading(false);
        setVolumeLoading(false);
        setMgLoading(false);
        setStrengthLoading(false);
        setIntensityLoading(false);
        setPrsLoading(false);
      }
    };
    loadAll();
  }, []);

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-4">Stats</h1>
      <ErrorBanner message={error} />

      {summaryLoading ? (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
        </div>
      ) : (
        <SummaryCards data={summary} />
      )}

      <div className="space-y-3">
        <AccordionSection title="Calendar" defaultOpen count={summary?.daysThisWeek !== undefined ? `This week: ${summary!.daysThisWeek}` : undefined}>
          <CalendarHeatmap data={calendar} loading={calendarLoading} />
        </AccordionSection>

        <AccordionSection title="Volume Overview" defaultOpen>
          <VolumeChart data={volume} loading={volumeLoading} />
        </AccordionSection>

        <AccordionSection title="Muscle Group Distribution">
          <MuscleGroupChart data={muscleGroups} loading={mgLoading} />
        </AccordionSection>

        <AccordionSection title="Per-Exercise Progression">
          <PerExerciseChart />
        </AccordionSection>

        <AccordionSection title="Strength Table">
          <StrengthTable data={strength} loading={strengthLoading} />
        </AccordionSection>

        <AccordionSection title="Set Intensity">
          <IntensityChart data={intensity} loading={intensityLoading} />
        </AccordionSection>

        <AccordionSection title="Personal Records">
          <PRSection data={prs} loading={prsLoading} />
        </AccordionSection>
      </div>
    </div>
  );
}
