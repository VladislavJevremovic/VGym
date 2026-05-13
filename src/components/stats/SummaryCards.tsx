import type { SummaryData } from "@/lib/types";

export default function SummaryCards({ data }: { data: SummaryData | null }) {
  if (!data) return null;
  const cards = [
    { label: "Total Workouts", value: data.totalWorkouts },
    { label: "Total Volume", value: `${(data.totalVolume / 1000).toFixed(1)}k kg` },
    { label: "Current Streak", value: data.currentStreak >= 3 ? `${data.currentStreak} 🔥` : String(data.currentStreak) },
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
