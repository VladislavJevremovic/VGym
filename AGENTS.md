# VGym — Workout Tracker PWA

<!-- BEGIN:nextjs-agent-rules -->
## Next.js 16 breaking changes

APIs, conventions, and file structure may differ from older Next.js. Read `node_modules/next/dist/docs/` before writing code. Heed deprecation notices. Key differences this repo relies on:
- **`src/proxy.ts`** replaces `middleware.ts` — export a named `proxy` function (not `middleware`), plus a `config.matcher`.
- `params` and `searchParams` in pages are plain objects, **not** Promises.
- `cookies()` from `next/headers` is async (`await cookies()`).
- `serverExternalPackages` in `next.config.ts` replaces `serverComponentsExternalPackages`.
<!-- END:nextjs-agent-rules -->

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm dev` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm tsc --noEmit` |
| Test | `pnpm test` |
| Verify package signatures | `pnpm audit signatures` |
| Generate DB migration | `pnpm db:generate` |
| Apply migration | `pnpm db:migrate` |
| Seed DB | `pnpm db:seed` |
| Drizzle Studio | `pnpm db:studio` |

**Order:** `db:generate` → `db:migrate` → `db:seed` (seed includes 54 exercises across 14 muscle groups, 6 PPL routines).

No formatter or CI. Vitest covers `src/lib/validation.ts`.

### Package manager: pnpm

`pnpm` is the only supported package manager — `packageManager` in `package.json` pins the version, and `.npmrc` enables `save-exact` (no `^`-ranged versions).

**Install-script policy: all postinstall scripts are denied by default.** The `allowBuilds` map in `pnpm-workspace.yaml` is the source of truth — `true` allows a package's install scripts to run, `false` rejects them, and an unlisted package will cause `pnpm install` to error until you decide.

The build succeeds with everything denied because the platform-specific binaries (`@esbuild/darwin-arm64`, `@next/swc-darwin-arm64`, `@unrs/resolver-binding-darwin-arm64`, etc.) are normal tarball deps with no scripts of their own.

When adding a dependency:
1. After `pnpm install`, check for new entries in pnpm's "Ignored build scripts" output.
2. For each, read the package's `package.json` `scripts.postinstall` (or `install` / `preinstall`) and confirm it is benign or skippable.
3. Record the decision in `pnpm-workspace.yaml` `allowBuilds`: set `false` to keep the script skipped. **Default to `false`** — most "install binary" scripts are redundant when the platform-specific binary already arrives as a separate npm package. Only set `true` if the postinstall is genuinely required at runtime.
4. If a postinstall script is genuinely needed, prefer pinning the dep to an audited exact version before allowing.

You can manage this interactively with `pnpm approve-builds <pkg>` (allow) or `pnpm approve-builds '!<pkg>'` (deny).

### Image optimization disabled

`next.config.ts` sets `images: { unoptimized: true }`. The app uses zero `next/image` calls, so `sharp` would be dead weight at runtime; disabling image optimization also lets us keep `sharp` on the postinstall denylist. **Do not introduce `next/image` without first re-enabling image optimization and re-evaluating the `sharp` policy.**

## Environment

Copy `.env.example` — requires `TURSO_DB_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`. DB is Turso (serverless SQLite via libsql + Drizzle ORM).

## Architecture

### Overview

- **Single package**, `@/*` → `./src/*`.
- **All pages are `"use client"`** with `useState`/`useEffect`/`fetch()`. No Server Components for data fetching.
- **Dark-only theme** (`bg-zinc-950` background, emerald accent, zinc palette). No light mode toggle.
- **Tailwind CSS v4** with `@tailwindcss/postcss` plugin.
- **ESLint 9 flat config** (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals` + `typescript`.

### Auth

- **Proxy guard** (`src/proxy.ts`): allows `/setup` and `/api/auth/*` unauthenticated. All other routes require `vgym_pin` HMAC-SHA256 cookie.
- **API routes** without valid cookie → `401 { error: "Unauthorized" }`.
- **Page routes** without valid cookie → redirect to `/setup`.
- **No sessions or JWTs.** Pure HMAC-SHA256 cookie with 32-byte random token.
- **Token format:** `hexToken:hexSignature` signed with `AUTH_SECRET`.
- **PIN storage:** bcrypt hash (cost 10) in `settings` table under key `"pin_hash"`.
- **Cookie:** `vgym_pin`, httpOnly, sameSite lax, secure in production, maxAge 30 days.
- **Rate limiting** on login: in-memory per-IP, 10 attempts per 5-min sliding window, 15-min lockout.

### DB Schema (7 tables)

#### `exercises`
| Column | Type | Constraints |
|---|---|---|
| `id` | `integer` | PK, AUTOINCREMENT |
| `name` | `text` | NOT NULL, UNIQUE |
| `muscle_group` | `text` | NOT NULL |
| `category` | `text` | NOT NULL (barbell \| trapbar \| dumbbell \| machine \| cable \| bodyweight \| cardio) |

#### `routines`
| Column | Type | Constraints |
|---|---|---|
| `id` | `integer` | PK, AUTOINCREMENT |
| `name` | `text` | NOT NULL, UNIQUE |

#### `routine_exercises`
| Column | Type | Constraints |
|---|---|---|
| `id` | `integer` | PK, AUTOINCREMENT |
| `routine_id` | `integer` | NOT NULL, FK → `routines.id` (CASCADE) |
| `exercise_id` | `integer` | NOT NULL, FK → `exercises.id` (CASCADE) |
| `sort_order` | `integer` | NOT NULL, DEFAULT 0 |

Indexes: `idx_re_routine_id`, `idx_re_exercise_id`

#### `workouts`
| Column | Type | Constraints |
|---|---|---|
| `id` | `integer` | PK, AUTOINCREMENT |
| `date` | `text` | NOT NULL (YYYY-MM-DD) |
| `routine_id` | `integer` | NULLABLE, FK → `routines.id` (SET NULL) |
| `notes` | `text` | NULLABLE |

Index: `idx_w_date`

#### `workout_exercises`
| Column | Type | Constraints |
|---|---|---|
| `id` | `integer` | PK, AUTOINCREMENT |
| `workout_id` | `integer` | NOT NULL, FK → `workouts.id` (CASCADE) |
| `exercise_id` | `integer` | NOT NULL, FK → `exercises.id` (CASCADE) |
| `sort_order` | `integer` | NOT NULL, DEFAULT 0 |

Indexes: `idx_we_workout_id`, `idx_we_exercise_id`

#### `sets`
| Column | Type | Constraints |
|---|---|---|
| `id` | `integer` | PK, AUTOINCREMENT |
| `workout_exercise_id` | `integer` | NOT NULL, FK → `workout_exercises.id` (CASCADE) |
| `set_number` | `integer` | NOT NULL |
| `reps` | `integer` | NOT NULL |
| `weight_kg` | `real` | NULLABLE |
| `duration_seconds` | `integer` | NULLABLE |

Index: `idx_s_workout_exercise_id`

#### `settings`
| Column | Type | Constraints |
|---|---|---|
| `key` | `text` | PK |
| `value` | `text` | NOT NULL |

### Pages & Routing

| Path | File | Type | Auth | Purpose |
|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Server | Redirect | Redirects to `/log` |
| `/setup` | `src/app/setup/page.tsx` | Client | **Public** | PIN setup/login |
| `/log` | `src/app/log/page.tsx` | Client | Yes | Free-form workout logging. `?edit=id` for editing. |
| `/stats` | `src/app/stats/page.tsx` | Client | Yes | Stats dashboard with 8 accordion sections |
| `/routines` | `src/app/routines/page.tsx` | Client | Yes | Routine CRUD (list, create, edit, delete) |
| `/routines/[id]` | `src/app/routines/[id]/page.tsx` | Client | Yes | Guided routine session with step navigation |
| `/history` | `src/app/history/page.tsx` | Client | Yes | Cursor-paginated workout history grouped by month |
| `/charts` | `src/app/charts/page.tsx` | Client | Yes | **Redirects** to `/stats` (legacy) |

### API Routes

| Method | Path | Auth | Pagination | Description |
|---|---|---|---|---|
| `GET` | `/api/auth/check` | No | — | `{ pinSet, authed }` |
| `POST` | `/api/auth/setup` | No | — | Create initial PIN |
| `POST` | `/api/auth/login` | No (rate-limited) | — | Verify PIN, set auth cookie |
| `GET` | `/api/exercises` | Yes | No | List all exercises ordered by muscle_group, name |
| `POST` | `/api/exercises` | Yes | No | Create custom exercise `{ name, muscleGroup, category }` |
| `PUT` | `/api/exercises/[id]` | Yes | No | Edit exercise |
| `DELETE` | `/api/exercises/[id]` | Yes | No | Delete exercise (409 if referenced) |
| `GET` | `/api/exercises/[id]/last` | Yes | No | Last workout sets for an exercise |
| `GET` | `/api/workouts` | Yes | Cursor (`beforeId`) | `?full=true` for nested, else plain list |
| `POST` | `/api/workouts` | Yes | — | Create workout (transactional) |
| `GET` | `/api/workouts/[id]` | Yes | — | Single workout with nested exercises + sets |
| `PUT` | `/api/workouts/[id]` | Yes | — | Update workout (delete + re-insert sets) |
| `DELETE` | `/api/workouts/[id]` | Yes | — | Delete workout (cascades) |
| `GET` | `/api/routines` | Yes | No | List routines with nested exercises |
| `POST` | `/api/routines` | Yes | — | Create routine `{ name, exerciseIds }` |
| `GET` | `/api/routines/[id]` | Yes | — | Single routine |
| `PUT` | `/api/routines/[id]` | Yes | — | Update routine name + exercises |
| `DELETE` | `/api/routines/[id]` | Yes | — | Delete routine (cascades) |
| `GET` | `/api/stats/[exerciseId]` | Yes | Time-window | Per-exercise stats (e1rm, volume, etc.) `?days=180` |
| `GET` | `/api/stats/summary` | Yes | — | Dashboard summary cards |
| `GET` | `/api/stats/calendar` | Yes | — | Workout calendar data `?months=12` |
| `GET` | `/api/stats/volume` | Yes | — | Volume over time `?period=weekly&count=12` |
| `GET` | `/api/stats/muscle-groups` | Yes | — | Volume per muscle group `?days=90` |
| `GET` | `/api/stats/strength-table` | Yes | — | Current e1RM per exercise `?days=90` |
| `GET` | `/api/stats/intensity` | Yes | — | Rep range distribution `?days=90` |
| `GET` | `/api/stats/prs` | Yes | — | Lifetime personal records per exercise |

### Components

| Component | File | Props | Description |
|---|---|---|---|
| `BottomNav` | `src/components/BottomNav.tsx` | none | 4-tab fixed nav (Log, Routines, History, Stats). Checks `window.__vgym_dirty` before navigating. |
| `ErrorBanner` | `src/components/ErrorBanner.tsx` | `{ message }` | Red-tinted error banner. Null when no message. |
| `ExercisePicker` | `src/components/ExercisePicker.tsx` | `{ onSelect, selectedId }` | Combobox with search + muscle-group accordion. ARIA-compliant keyboard nav. Module-level cache. "Manage exercises" button at bottom. |
| `SetInput` | `src/components/SetInput.tsx` | `{ category, onAdd, onLogCardio }` | Strength mode (reps + weight + rest timer with countdown) or Cardio mode (minutes + seconds). Rep presets [1,5,8,10,12,15,20]. Rest presets [60,90,120,180]. |
| `SetRow` | `src/components/SetRow.tsx` | `{ setNumber, reps, weightKg, durationSeconds, onDelete, readonly, prBadge }` | Single set display. Optional PR badge. |
| `UndoToast` | `src/components/UndoToast.tsx` | `{ label, onUndo }` | Fixed bottom toast with undo. 5s auto-dismiss by caller. |
| `ServiceWorkerRegistrar` | `src/components/ServiceWorkerRegistrar.tsx` | none | Registers SW, detects waiting updates, shows "New version" update banner. |

### Data Fetching Patterns

- **All pages use raw `fetch()`** with `useEffect` + try/catch. No React Query / SWR.
- Standard pattern: `loading` boolean → skeleton UI, `error` string → `ErrorBanner`, empty array → empty state message.
- **Exercise caching:** `ExercisePicker` caches exercises in a module-level variable (`cachedExercises`). `RoutineForm` does NOT — fetches fresh each mount.
- **Dirty tracking:** `src/lib/global.d.ts` extends `Window` with `__vgym_dirty`. Set by `/log` when unsaved sets exist. Checked by `BottomNav` and `beforeunload` event.

### Validation (`src/lib/validation.ts`)

- `validateDate` — must match `YYYY-MM-DD` regex and be a real date.
- `validateExerciseId` — must be a positive integer.
- `validateSetForCategory(category, set)` — cardio: `durationSeconds` required; strength: `reps` required, `weightKg` optional but non-negative.
- `validateExercises` — applies above per-exercise.
- `validateCreateWorkoutBody(body)` — date + non-empty exercises array + requires all fields.
- `validateUpdateWorkoutBody(body)` — date optional, exercises required (same per-set rules).
- `validateRoutineBody(body)` — name + non-empty exerciseIds array.

### PWA Strategy

- **Service Worker** (`public/sw.js`):
  - **Install:** Pre-caches 4 shell URLs (`/log`, `/routines`, `/history`, `/stats`).
  - **Activate:** Delete old caches, claim clients, flush offline mutation queue.
  - **API GETs:** Network-first with IndexedDB cache fallback (`api-cache` store).
  - **API mutations (POST/PUT/DELETE):** Network-first; on failure, queue in IndexedDB (`mutations` store) for later retry.
  - **Static assets (`_next/static`):** Cache-first.
  - **Navigation:** Network-first with cache fallback.
  - **Offline queue:** Flushed sequentially on online event or after successful API fetch.
- **Manifest** (`public/manifest.json`): `display: standalone`, portrait, dark theme, 192+512 icons.
- **Update flow:** `ServiceWorkerRegistrar` → posts `SKIP_WAITING` → `skipWaiting()` + `claim()` → page reload.

### Stats Architecture

All stats endpoints compute from existing tables (no dedicated stats tables). Key formulas:
- **Volume** = Σ(reps × weight_kg), rounded to 1 decimal.
- **e1RM** (Epley) = maxWeight × (1 + reps_at_maxWeight / 30).
- **Streaks** = consecutive calendar days with ≥1 workout (current + longest).
- **Intensity buckets:** 1–5 (Strength), 6–8 (Strength/Hypertrophy), 9–12 (Hypertrophy), 13+ (Endurance).
- **PR detection:** Compare each set against lifetime bests (max weight, max reps, best e1RM, max volume) per exercise.

### Seed Data

- **54 exercises** across 14 muscle groups: Chest (7), Back (6), Trapezius (3), LowerBack (2), Shoulders (8), Biceps (5), Triceps (2), Forearms (1), Quads (6), Hamstrings (3), Glutes (3), Calves (2), Core (3), Cardio (3).
- **6 routines:** PPL Push A, PPL Pull A, PPL Legs A, PPL Push B, PPL Pull B, PPL Legs B.
- Uses `onConflictDoUpdate` for idempotent re-seeding.
- `db:seed` run via `tsx src/drizzle/seed.ts`.

### File Structure (`src/`)

```
src/
├── app/
│   ├── api/
│   │   ├── auth/check|login|setup/route.ts
│   │   ├── exercises/route.ts + [id]/route.ts + [id]/last/route.ts
│   │   ├── routines/route.ts + [id]/route.ts
│   │   ├── stats/route.ts (per-exercise) + summary|calendar|volume|muscle-groups|strength-table|intensity|prs/route.ts
│   │   └── workouts/route.ts + [id]/route.ts
│   ├── charts/page.tsx (→ redirect)
│   ├── history/page.tsx
│   ├── log/page.tsx
│   ├── routines/page.tsx + [id]/page.tsx
│   ├── setup/page.tsx
│   ├── stats/page.tsx
│   ├── layout.tsx
│   ├── error.tsx
│   └── globals.css
├── components/
│   ├── BottomNav.tsx
│   ├── ErrorBanner.tsx
│   ├── ExercisePicker.tsx
│   ├── ServiceWorkerRegistrar.tsx
│   ├── SetInput.tsx
│   ├── SetRow.tsx
│   └── UndoToast.tsx
├── drizzle/
│   ├── schema.ts
│   ├── seed.ts
│   └── migrations/
├── lib/
│   ├── auth.ts / auth-constants.ts
│   ├── constants.ts (MUSCLE_GROUPS, CATEGORIES, presets)
│   ├── db.ts (singleton + helpers)
│   ├── types.ts (Exercise, Routine, Workout, StatsDataPoint, etc.)
│   ├── utils.ts (date formatting, duration, mapSetsForApi, getErrorMessage)
│   ├── validation.ts + validation.test.ts
│   ├── rate-limit.ts
│   └── global.d.ts
└── proxy.ts
```
