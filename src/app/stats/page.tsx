"use client";

import { useState, useEffect } from "react";
import ErrorBanner from "@/components/ErrorBanner";
import AccordionSection from "@/components/stats/AccordionSection";
import SkeletonCard from "@/components/stats/SkeletonCard";
import SummaryCards from "@/components/stats/SummaryCards";
import CalendarHeatmap from "@/components/stats/CalendarHeatmap";
import StrengthTable from "@/components/stats/StrengthTable";
import IntensityChart from "@/components/stats/IntensityChart";
import MuscleGroupChart from "@/components/stats/MuscleGroupChart";
import WeeklySetsChart from "@/components/stats/WeeklySetsChart";
import VolumeChart from "@/components/stats/VolumeChart";
import PerExerciseChart from "@/components/stats/PerExerciseChart";
import PRSection from "@/components/stats/PRSection";
import type {
  SummaryData, CalendarDay,
  MuscleGroupVolume, StrengthRow, IntensityBucket, PRData, WeeklySetsSeries,
} from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

export default function StatsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupVolume[]>([]);
  const [mgLoading, setMgLoading] = useState(true);
  const [weeklySets, setWeeklySets] = useState<WeeklySetsSeries | null>(null);
  const [weeklySetsLoading, setWeeklySetsLoading] = useState(true);
  const [strength, setStrength] = useState<StrengthRow[]>([]);
  const [strengthLoading, setStrengthLoading] = useState(true);
  const [intensity, setIntensity] = useState<IntensityBucket[]>([]);
  const [intensityLoading, setIntensityLoading] = useState(true);
  const [prs, setPrs] = useState<PRData[]>([]);
  const [prsLoading, setPrsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchJson = async <T,>(url: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json() as Promise<T>;
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [s, c, mg, st, i, p, ws] = await Promise.all([
          fetchJson<SummaryData>("/api/stats/summary"),
          fetchJson<CalendarDay[]>("/api/stats/calendar?months=12"),
          fetchJson<MuscleGroupVolume[]>("/api/stats/muscle-groups?days=90"),
          fetchJson<StrengthRow[]>("/api/stats/strength-table?days=90"),
          fetchJson<IntensityBucket[]>("/api/stats/intensity?days=90"),
          fetchJson<PRData[]>("/api/stats/prs"),
          fetchJson<WeeklySetsSeries>("/api/stats/weekly-sets?weeks=8"),
        ]);
        setSummary(s);
        setCalendar(c);
        setMuscleGroups(mg);
        setStrength(st);
        setIntensity(i);
        setPrs(p);
        setWeeklySets(ws);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      } finally {
        setSummaryLoading(false);
        setCalendarLoading(false);
        setMgLoading(false);
        setStrengthLoading(false);
        setIntensityLoading(false);
        setPrsLoading(false);
        setWeeklySetsLoading(false);
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
          <VolumeChart />
        </AccordionSection>

        <AccordionSection title="Muscle Group Distribution">
          <MuscleGroupChart data={muscleGroups} loading={mgLoading} />
        </AccordionSection>

        <AccordionSection title="Weekly Sets per Muscle">
          <WeeklySetsChart data={weeklySets} loading={weeklySetsLoading} />
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
