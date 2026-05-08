# VGym — Stats & Feature Implementation Plan

## Overview

This document details the implementation plan for the next VGym feature batch:

1. **Stats dashboard** (new `/stats` page with 8 accordion sections, replacing `/charts`)
2. **6 new stats API endpoints** (summary, calendar, volume, muscle-groups, strength-table, intensity, prs)
3. **PR detection** during workout logging
4. **Custom exercises CRUD** (create/edit/delete)
5. **AGENTS.md** full rewrite (done)

No DB schema changes are needed — all features compute from the 7 existing tables.

---

## 1. Stats Dashboard (`/stats`)

### Route

- **New file:** `src/app/stats/page.tsx`
- **Old file:** `src/app/charts/page.tsx` → replaced with a redirect (`redirect("/stats")`)
- **BottomNav:** `Charts` tab → `Stats` tab, link from `/charts` to `/stats`

### Layout (accordion sections, single scrollable page)

```
┌─ Summary Cards ──────────────────────────────┐
│ [Total Workouts] [Total Volume] [Streak] [x] │   ← always visible
└───────────────────────────────────────────────┘
┌─ Calendar Heatmap ───────────────────────────┐   ← visible by default (expanded)
│ 7×53 grid of colored squares                  │
└───────────────────────────────────────────────┘
┌─ Volume Overview [▼] ────────────────────────┐   ← expanded by default
│ Weekly bar chart (Recharts)                   │
│ Toggle: weekly / monthly                      │
└───────────────────────────────────────────────┘
┌─ Muscle Group Distribution [▼] ──────────────┐   ← collapsed
│ Donut chart (Recharts PieChart)               │
└───────────────────────────────────────────────┘
┌─ Per-Exercise Progression [▼] ───────────────┐   ← collapsed
│ ExercisePicker + metric selector + line/bar   │
│ (existing /charts logic moved here)            │
└───────────────────────────────────────────────┘
┌─ Strength Table [▼] ─────────────────────────┐   ← collapsed
│ Sortable e1RM reference table                 │
└───────────────────────────────────────────────┘
┌─ Set Intensity Distribution [▼] ─────────────┐   ← collapsed
│ Rep-range histogram bar chart                 │
└───────────────────────────────────────────────┘
┌─ Personal Records [▼] ───────────────────────┐   ← collapsed
│ Per-exercise expandable PR cards              │
└───────────────────────────────────────────────┘
```

### Accordion behavior

- Each section is a `div` wrapping a clickable header and a collapsible body.
- Default expanded: Summary cards (always visible), Calendar heatmap, Volume overview.
- All others collapsed by default.
- Clicking a collapsed header expands that section; clicking an expanded header collapses it.

### Summary cards (always visible)

4 stat cards in a 2×2 grid, fetched from `GET /api/stats/summary`:
- **Total Workouts** — lifetime count
- **Total Volume** — lifetime volume (kg rounded to 0 decimals)
- **Current Streak** — consecutive days with a workout (🔥 icon if ≥3)
- **Days This Week** — number of workout days this week (Mon–Sun)

---

## 2. New API Endpoints

### 2.1 `GET /api/stats/summary`

**File:** `src/app/api/stats/summary/route.ts`

**Query params:** none

**Logic:**
- `totalWorkouts`: `SELECT COUNT(*) FROM workouts`
- `totalVolume`: `SELECT COALESCE(SUM(sets.reps * sets.weight_kg), 0) FROM sets INNER JOIN workout_exercises ...`
- `currentStreak`: Query all distinct workout dates ordered DESC. Walk from today backward counting consecutive days that have a workout. Stop at first gap.
- `longestStreak`: Same traversal but compute max consecutive run across all dates.
- `daysThisWeek`: Count distinct dates in the current ISO week (Mon start).

**Response:**
```json
{
  "totalWorkouts": 42,
  "totalVolume": 158340.5,
  "currentStreak": 5,
  "longestStreak": 12,
  "daysThisWeek": 3,
  "weeklyVolume": 12500.0
}
```

---

### 2.2 `GET /api/stats/calendar`

**File:** `src/app/api/stats/calendar/route.ts`

**Query params:**
- `months` (optional, default 12) — lookback window

**Logic:**
- Compute cutoff date: `today - months * 30 days`
- `SELECT date, COUNT(*) as workout_count FROM workouts WHERE date >= ? GROUP BY date ORDER BY date`
- Compute `totalVolume` per date by joining through sets.

**Response:**
```json
[
  { "date": "2026-01-15", "workoutCount": 1, "totalVolume": 8500.0 },
  { "date": "2026-01-17", "workoutCount": 1, "totalVolume": 7200.0 }
]
```

**UI:** 7-row × ~53-column grid of 12px squares. Each column = 1 week. Each cell = 1 day. Color intensity:
- 0 workouts: `bg-zinc-900`
- 1 workout: `bg-emerald-900`
- 2 workouts: `bg-emerald-700`
- 3+ workouts: `bg-emerald-500`

Month labels (Jan, Feb...) above first week of each month. Day labels (Mon, Wed, Fri) on left.

---

### 2.3 `GET /api/stats/volume`

**File:** `src/app/api/stats/volume/route.ts`

**Query params:**
- `period` (optional, `"weekly"` | `"monthly"`, default `"weekly"`)
- `count` (optional, default 12) — number of periods to return

**Logic:**
- For weekly: group by ISO week (`strftime('%Y-W%W', date)`)
- For monthly: group by `strftime('%Y-%m', date)`
- Compute `SUM(reps * weight_kg)`, `COUNT(DISTINCT workout_id)`, `COUNT(*) as totalSets`
- Return last `count` periods, oldest first.

**Response:**
```json
[
  { "period": "2026-W03", "totalVolume": 12500.0, "workoutCount": 3, "totalSets": 18 },
  { "period": "2026-W04", "totalVolume": 9800.0, "workoutCount": 2, "totalSets": 14 }
]
```

**UI:** Bar chart (Recharts `BarChart`). Toggle between weekly/monthly. Tooltip shows volume, workouts, sets.

---

### 2.4 `GET /api/stats/muscle-groups`

**File:** `src/app/api/stats/muscle-groups/route.ts`

**Query params:**
- `days` (optional, default 90)

**Logic:**
- Join `sets` → `workout_exercises` → `exercises`
- Filter to workouts within the time window
- `GROUP BY exercises.muscle_group`
- Sum `reps * weight_kg` as volume, count distinct exercises, count total sets
- Order by volume descending

**Response:**
```json
[
  { "muscleGroup": "Chest", "volume": 12500.0, "setCount": 48, "exerciseCount": 5 },
  { "muscleGroup": "Quads", "volume": 9800.0, "setCount": 36, "exerciseCount": 4 }
]
```

**UI:** Donut chart (Recharts `PieChart`). Hover shows muscle group name and percentage. Legend below.

---

### 2.5 `GET /api/stats/strength-table`

**File:** `src/app/api/stats/strength-table/route.ts`

**Query params:**
- `days` (optional, default 90)

**Logic:**
- For each exercise in the lookback window, find the set with the highest e1RM
- e1RM (Epley): `weight * (1 + reps / 30)`
- Only for non-cardio exercises
- Join through `workout_exercises` → `exercises`
- Include the date of the PR set

**Response:**
```json
[
  { "exerciseId": 1, "name": "DB Bench Press", "muscleGroup": "Chest", "e1rm": 85.3, "date": "2026-05-01" },
  { "exerciseId": 35, "name": "DB Squat", "muscleGroup": "Quads", "e1rm": 110.0, "date": "2026-04-28" }
]
```

**UI:** Table with sortable columns (click header to sort asc/desc). Columns: Exercise, Muscle Group, e1RM (kg), Date. Alternating row colors. Empty state: "No strength data in the last N days."

---

### 2.6 `GET /api/stats/intensity`

**File:** `src/app/api/stats/intensity/route.ts`

**Query params:**
- `days` (optional, default 90)

**Logic:**
- Fetch all non-cardio sets within the time window
- Categorize by reps:
  - `1-5` → "Strength"
  - `6-8` → "Strength/Hypertrophy"
  - `9-12` → "Hypertrophy"
  - `13+` → "Endurance"
- `GROUP BY bucket`, count sets

**Response:**
```json
[
  { "range": "1-5", "label": "Strength", "count": 24 },
  { "range": "6-8", "label": "Strength/Hypertrophy", "count": 42 },
  { "range": "9-12", "label": "Hypertrophy", "count": 68 },
  { "range": "13+", "label": "Endurance", "count": 15 }
]
```

**UI:** Horizontal bar chart (or vertical). Each bar colored differently. Tooltip shows count and percentage of total.

---

### 2.7 `GET /api/stats/prs`

**File:** `src/app/api/stats/prs/route.ts`

**Query params:** none (lifetime data)

**Logic:**
- For each exercise, compute:
  - `maxWeight`: max `weight_kg` across all sets (with the `reps` at that weight)
  - `maxReps`: max `reps` across all sets (with the `weight_kg` at that reps count)
  - `bestE1rm`: highest `weight * (1 + reps / 30)`
  - `maxVolume`: highest `reps * weight_kg` for a single set
- Each PR includes the date it was achieved
- Skip cardio exercises (no weight-based data)
- Include exercises with zero logged sets (no PRs)

**Response:**
```json
[
  {
    "exerciseId": 1,
    "name": "DB Bench Press",
    "muscleGroup": "Chest",
    "maxWeight": { "value": 30, "reps": 8, "date": "2026-04-15" },
    "maxReps": { "value": 15, "weight": 22, "date": "2026-03-20" },
    "bestE1rm": { "value": 38.0, "date": "2026-04-15" },
    "maxVolume": { "value": 240, "date": "2026-04-15" }
  }
]
```

**UI:** Expandable per-exercise cards. Each card header = exercise name + muscle group badge. On expand, show 4 PR metrics with values and dates.
- Records that were set recently (within 30 days) get a small 🔥 icon

---

## 3. PR Detection During Logging

### Where

In `src/app/log/page.tsx`, after `handleAddSet(reps, weight)`.

### Logic

1. On mount (or after each save), fetch `GET /api/stats/prs` and store in a `prs` ref (`Map<exerciseId, PRData>`).
2. After `handleAddSet`, compare the new set against the cached PR for that exercise:
   - If `weight > maxWeight.value` → `prBadge = "PR"` (weight PR)
   - If `weight * (1 + reps / 30) > bestE1rm.value` → `prBadge = "e1RM"` (e1RM PR)
   - If `reps > maxReps.value` → `prBadge = "Reps"` (reps PR)
   - If `reps * weight > maxVolume.value` → `prBadge = "Volume"` (volume PR)
   - Priority: weight > e1RM > volume > reps (show the highest tier badge)

### UI

- `SetRow` gains an optional `prBadge?: string` prop.
- When present, render a small `+PR` / `+e1RM` / `+Reps` / `+Volume` badge in `text-emerald-400 bg-emerald-500/10 text-xs font-bold px-1.5 py-0.5 rounded` next to the set number/values.

---

## 4. Custom Exercises CRUD

### 4.1 API

#### `POST /api/exercises`

**File:** `src/app/api/exercises/route.ts` (existing, add handler)

**Body:** `{ name: string, muscleGroup: string, category: string }`

**Validation:**
- `name`: required, unique (catch Drizzle constraint error)
- `muscleGroup`: must be one of `MUSCLE_GROUPS` from `constants.ts`
- `category`: must be one of `CATEGORIES` from `constants.ts`

**Response:** `201 { id, name, muscleGroup, category }`

**Error:** `409 { error: "Exercise already exists" }` if name taken. `400` for invalid fields.

#### `PUT /api/exercises/[id]`

**File:** `src/app/api/exercises/[id]/route.ts` (new)

**Params:** `id` — numeric exercise ID

**Body:** `{ name?, muscleGroup?, category? }` (all optional, at least one required)

**Logic:** Update specified fields, return updated exercise. 404 if not found.

**Response:** `200 Exercise`

#### `DELETE /api/exercises/[id]`

**File:** `src/app/api/exercises/[id]/route.ts` (new)

**Params:** `id` — numeric exercise ID

**Logic:**
1. Check if any `workout_exercises` reference this exercise → if yes, `409 { error: "Exercise is used in N workouts. Delete workouts first." }`
2. Check if any `routine_exercises` reference this exercise → if yes, include in the error count
3. Otherwise, delete from `exercises` table

**Response:** `200 { success: true }` or `409 { error }`

### 4.2 UI — Manage Exercises Modal

**File:** `src/components/ExercisePicker.tsx` (extended)

**Trigger:** "Manage exercises" button at the bottom of the `ExercisePicker` dropdown (below the exercise list)

**Modal content:**
1. **Create form:**
   - Name input (`text`, required)
   - Muscle group `<select>` (from `MUSCLE_GROUPS`)
   - Category `<select>` (from `CATEGORIES`)
   - "Add Exercise" button
   - Validation: name required, muscle group + category selected

2. **Exercise list:**
   - Scrollable list of all exercises (fetched fresh after CRUD)
   - Each row: exercise name (bold) + muscle group badge + category badge
   - Edit icon (pencil) → inline edit: name becomes text input, muscle group + category become selects. Save/cancel buttons.
   - Delete icon (trash) → opens confirmation "Delete [name]?". On confirm, calls DELETE. On 409, shows error "Exercise is in use by N workouts."

3. **Visual:** Full-screen fixed overlay with `bg-black/50` backdrop, `bg-zinc-900` card centered, `max-w-md`, close button (X) top-right.

---

## 5. File Change Manifest

### New files

| File | Purpose |
|---|---|
| `src/app/stats/page.tsx` | Stats dashboard page with accordion sections |
| `src/app/api/stats/summary/route.ts` | Summary cards endpoint |
| `src/app/api/stats/calendar/route.ts` | Calendar heatmap endpoint |
| `src/app/api/stats/volume/route.ts` | Volume-over-time endpoint |
| `src/app/api/stats/muscle-groups/route.ts` | Muscle group volume distribution endpoint |
| `src/app/api/stats/strength-table/route.ts` | Rolling 1RM table endpoint |
| `src/app/api/stats/intensity/route.ts` | Rep range intensity endpoint |
| `src/app/api/stats/prs/route.ts` | Personal records endpoint |
| `src/app/api/exercises/[id]/route.ts` | Exercise PUT/DELETE endpoint |

### Modified files

| File | Change |
|---|---|
| `src/app/api/exercises/route.ts` | Add POST handler |
| `src/app/charts/page.tsx` | Replace with `redirect("/stats")` |
| `src/components/BottomNav.tsx` | Rename "Charts" → "Stats", route `/charts` → `/stats` |
| `src/components/ExercisePicker.tsx` | Add "Manage exercises" button → modal with full CRUD |
| `src/components/SetRow.tsx` | Add optional `prBadge` prop, render PR badge |
| `src/app/log/page.tsx` | Fetch PRs on mount, PR detection in `handleAddSet` |
| `src/lib/types.ts` | Add `PRData`, `CalendarDay`, `SummaryData`, `MuscleGroupVolume`, `StrengthRow`, `IntensityBucket` types |
| `public/sw.js` | Update pre-cache shell URLs (add `/stats`) |

### No changes

- DB schema — all features computed from existing 7 tables

---

## 6. Edge Cases & Decisions

- **Streak definition:** "Consecutive calendar days with at least 1 workout." A workout on Mon and Wed = streak of 1 (skipped Tuesday breaks streak). This is the standard gym app convention.
- **Cardio exclusion:** Cardio exercises are excluded from e1RM calculations, strength table, intensity distribution, and PRs. They count toward workout count, calendar heatmap, total volume (if weight_kg is provided).
- **Volume formula:** `reps × weight_kg`. Bodyweight exercises with `weight_kg = null` contribute 0 volume. This is correct — no external load means no meaningful "volume."
- **e1RM formula:** Epley: `weight × (1 + reps / 30)`. Same formula used across all stats. Brzycki or other formulas not implemented (keep it simple and consistent).
- **Intensity rep ranges:** 1-5, 6-8, 9-12, 13+. These are standard rep-range zones. If a range has 0 sets, it's still included with `count: 0` so the chart always shows all 4 bars.
- **PR priority during logging:** Weight PR > e1RM PR > Volume PR > Reps PR. Only one badge shown per set (the highest tier achieved). A new set could trivially set multiple records (e.g., first set ever for an exercise), but showing one badge keeps the UI clean.
- **Sorting in strength table:** Default sort by e1RM descending. Click column headers to sort by any column. Sorting is client-side (the array is small — max 54 exercises).
- **Calendar heatmap rendering:** Pure CSS grid with Tailwind classes. No external library needed. Each cell is a `div` with `w-3 h-3 rounded-sm`. 53 columns wrapped in a flex container. Month labels computed by checking the first date of each week.
- **Stats page layout:** Uses the same `max-w-lg mx-auto pb-20` wrapper as other pages. Sections are rendered as `<div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 mb-4">` for visual consistency.

---

## 7. Implementation Order

1. Types (`src/lib/types.ts`) — add all new TypeScript interfaces
2. API endpoints (7 new + 1 modified exercises POST) — backend-first
3. `SetRow` PR badge prop — small component change
4. `ExercisePicker` manage modal — standalone feature
5. Stats page — the largest frontend change
6. `BottomNav` + `charts` redirect + SW pre-cache update — wiring
7. PR detection in `/log` — integrate with logging flow

Steps 1–2 and 3–4 can be parallelized. Step 5 depends on 1–2. Steps 6–7 depend on 3–5.
