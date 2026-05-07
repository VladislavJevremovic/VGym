# VGym Code Review & Architecture Guide

A thorough technical review of VGym — a mobile-first PWA workout tracker. This document covers what the app does well, where it can improve, and explains the "why" behind each recommendation. Written for developers getting into full-stack webapp development.

---

## Table of Contents

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Project Structure](#2-project-structure)
3. [What's Done Well](#3-whats-done-well)
4. [Security Analysis](#4-security-analysis)
5. [Architecture Improvements](#5-architecture-improvements)
6. [Database Considerations](#6-database-considerations)
7. [Frontend & UX Improvements](#7-frontend--ux-improvements)
8. [PWA & Offline](#8-pwa--offline)
9. [Missing Features Roadmap](#9-missing-features-roadmap)
10. [Next.js 16 Compliance](#10-nextjs-16-compliance)
11. [Summary & Next Steps](#11-summary--next-steps)

---

## 1. Tech Stack Overview

VGym is a single-user workout tracker designed for iPhone Safari, with PIN-based authentication and offline-capable PWA support.

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| Framework | Next.js (App Router) | 16.2.4 | Full-stack React framework |
| UI Library | React | 19.2.4 | Component rendering |
| Language | TypeScript | 5.x (strict) | Type safety |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Icons | Lucide React | 1.14 | SVG icon components |
| Charts | Recharts | 3.8 | Data visualization |
| ORM | Drizzle ORM | 0.45 | Type-safe database queries |
| Database | Turso (libsql) | 0.17 | Serverless SQLite |
| Auth | bcryptjs + HMAC-SHA256 | 3.0 | PIN hashing & token signing |
| Linting | ESLint | 9.x (flat config) | Code quality |
| Bundler | Turbopack | (built into Next.js 16) | Dev/build bundling |

**Verdict:** This is a modern, well-chosen stack. Each tool earns its place — there's no bloat. Drizzle over Prisma is a good call for a SQLite project (lighter, faster). Turso gives you a hosted SQLite database without managing infrastructure. Tailwind CSS 4 is the latest version with significant performance improvements. The only notable absence is a client-side data caching library (more on that in [Section 5](#5-architecture-improvements)).

---

## 2. Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (dark theme, bottom nav, PWA meta)
│   ├── page.tsx                  # Redirects to /log
│   ├── globals.css               # Tailwind imports + custom resets
│   ├── setup/page.tsx            # PIN login/setup screen
│   ├── log/page.tsx              # Quick workout logging
│   ├── history/page.tsx          # Paginated workout history
│   ├── charts/page.tsx           # Exercise progress charts
│   ├── routines/
│   │   ├── page.tsx              # Routine list + create form
│   │   └── [id]/page.tsx         # Guided routine session runner
│   └── api/
│       ├── auth/                 # check, login, setup endpoints
│       ├── exercises/            # List + last-performance lookup
│       ├── workouts/             # CRUD + full-structure fetch
│       ├── routines/             # List + create
│       └── stats/                # Exercise progress data for charts
├── components/
│   ├── BottomNav.tsx             # Fixed bottom navigation (4 tabs)
│   ├── ExercisePicker.tsx        # Searchable exercise dropdown
│   ├── SetInput.tsx              # Reps/weight input + rest timer
│   ├── SetRow.tsx                # Single set display row
│   └── ServiceWorkerRegistrar.tsx # PWA service worker setup
├── drizzle/
│   ├── schema.ts                 # Database table definitions
│   ├── seed.ts                   # Exercise + routine seed data
│   └── migrations/               # SQL migration files
├── lib/
│   ├── auth.ts                   # PIN hashing, token creation, cookie management
│   ├── auth-constants.ts         # Cookie name, max age
│   ├── db.ts                     # Singleton database instance
│   ├── rate-limit.ts             # In-memory brute-force protection
│   ├── types.ts                  # Shared TypeScript interfaces
│   └── utils.ts                  # Date formatting utility
└── proxy.ts                      # Auth guard (replaces middleware in Next.js 16)

public/
├── manifest.json                 # PWA manifest
├── sw.js                         # Service worker
└── icons/                        # App icons (192, 512)
```

This structure follows Next.js App Router conventions well. The separation of `lib/` (utilities), `components/` (reusable UI), `drizzle/` (database layer), and `app/api/` (backend routes) is clean and maintainable.

---

## 3. What's Done Well

### Authentication Architecture
The auth system is surprisingly thorough for a personal PWA:

- **`proxy.ts`** intercepts every request and verifies the HMAC-SHA256 signature on the auth cookie — not just checking if a cookie exists, but cryptographically verifying it was issued by this server. This is exactly the right approach.
- **`bcryptjs`** hashes PINs with 10 salt rounds before storing them. Even if the database is compromised, PINs can't be read.
- **Rate limiting** on the login endpoint prevents brute-force PIN guessing (10 attempts per 5-minute window, then a 15-minute lockout).
- **Auth flow separation** — setup, login, and check are separate endpoints with distinct responsibilities. The setup endpoint refuses to overwrite an existing PIN.

### Database Schema Design
The schema in `src/drizzle/schema.ts` is properly normalized:

```
exercises ──┐
             ├── workoutExercises ── sets
workouts ───┘
```

- Junction tables (`workoutExercises`, `routineExercises`) correctly model many-to-many relationships
- Cascade deletes ensure no orphaned records — deleting a workout automatically removes its exercises and sets
- `routineId` on workouts uses `onDelete: "set null"` instead of cascade, so deleting a routine doesn't destroy workout history
- Column types are appropriate: `integer` for counts, `real` for weights (allows decimals), `text` for dates

### TypeScript Usage
- **Strict mode** is enabled in `tsconfig.json` — this catches a whole class of bugs at compile time
- All interfaces are explicitly defined in `src/lib/types.ts`
- Error handling uses proper type narrowing: `(e: unknown) => e instanceof Error ? e.message : "..."` — this is the correct pattern since catch blocks receive `unknown` in strict mode
- API request bodies are validated before use, not just cast to types

### Input Validation
Every API POST route validates its inputs:
- Exercise IDs must be positive integers
- Reps must be positive integers
- Weights must be non-negative numbers or null
- PIN must be 4-16 characters
- Routine name and exercise list are required

This prevents invalid data from entering the database, which is a common oversight in new projects.

### Transaction Usage
The workout creation route (`POST /api/workouts`) wraps all inserts in a database transaction. This ensures that if any insert fails (e.g., an invalid exercise ID), the entire operation rolls back — you never end up with a half-saved workout.

### Cursor-Based Pagination
The history page uses `beforeId` for pagination instead of `offset/limit`. This is the better approach:
- **Offset pagination** breaks when items are added or deleted between pages (you skip or duplicate items)
- **Cursor pagination** is stable — it always picks up exactly where it left off

### Mobile-First UX
- `inputMode="numeric"` and `inputMode="decimal"` trigger the correct mobile keyboard
- Weight persists between sets (since most sets use the same weight)
- Rest timer auto-starts after adding a set, with visual countdown
- Bottom nav uses safe-area padding for notched phones
- Dark theme throughout reduces eye strain during gym sessions

### Service Worker Strategy
The caching strategies in `sw.js` are correctly differentiated:
- **Static assets** (`/_next/static/`): Cache-first — these are content-hashed, safe to cache indefinitely
- **Navigation requests**: Network-first with cache fallback — ensures fresh pages when online, still works offline
- **API calls**: Network-only — data mutations should never be served from cache

---

## 4. Missing Features Roadmap

Features commonly found in workout trackers that VGym doesn't yet have, prioritized by user impact:

| Priority | Feature | Effort | Notes |
|----------|---------|--------|-------|
| P1 | Workout editing | Medium | Currently only create + delete; users can't fix typos or add a forgotten set |
| P1 | Routine editing/deletion | Low | Can create routines but can't modify or remove them |
| P2 | Custom exercise creation | Low | Currently limited to the 60 seeded exercises |
| P2 | Unit toggle (kg/lb) | Low | Only kg is supported; store preference in settings table |
| P2 | Data export (JSON/CSV) | Low | Important for data ownership and backup |
| P3 | Workout duplication | Low | "Repeat last workout" saves time on recurring sessions |
| P3 | Data import | Medium | Restore from backup or migrate from another app |
| P3 | Exercise search in history | Low | Find all workouts containing a specific exercise |
| P3 | Superset/circuit support | Medium | Group exercises that are performed back-to-back |

---

## 5. Summary & Next Steps

### What's Strong
VGym demonstrates solid fundamentals: a well-designed database schema, proper authentication with cryptographic verification, type-safe code, thorough input validation, and a thoughtful mobile UX. The tech stack choices are modern and well-suited to the project's needs.

### Further Learning

If you want to go deeper into the concepts mentioned in this review:

- **Server Components vs Client Components**: The Next.js docs on [Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering) explain when to use each
- **Database indexing**: Understanding indexes is one of the highest-leverage database skills — SQLite's [Query Planning documentation](https://www.sqlite.org/queryplanner.html) is excellent
- **Web accessibility**: The [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) has patterns for every common component
- **PWA offline strategies**: Google's [Workbox](https://developer.chrome.com/docs/workbox) library handles service worker caching patterns so you don't have to write them by hand
- **Data fetching patterns**: The [SWR documentation](https://swr.vercel.app/) explains stale-while-revalidate and why it matters for UX
