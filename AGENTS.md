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
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Typecheck | `npx tsc --noEmit` |
| Generate DB migration | `npm run db:generate` |
| Apply migration | `npm run db:migrate` |
| Seed DB | `npm run db:seed` |
| Drizzle Studio | `npm run db:studio` |

**Order:** `db:generate` → `db:migrate` → `db:seed` (seed includes 60 exercises, 4 routines).

No tests, no formatter, no CI.

## Environment

Copy `.env.example` — requires `TURSO_DB_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`. DB is Turso (serverless SQLite via libsql + Drizzle ORM).

## Architecture

- **Single package** (no workspaces), `@/*` → `./src/*`.
- **All pages are `"use client"`** with `useState`/`useEffect`/`fetch()`. No Server Components for data fetching.
- **Auth guard** in `src/proxy.ts`: allows `/setup` and `/api/auth/*` unauthenticated; all other routes check HMAC-SHA256 cookie `vgym_pin`. API → 401, pages → redirect to `/setup`.
- **7 DB tables:** exercises, routines, routine_exercises, workouts, workout_exercises, sets, settings (pin_hash). Dates stored as `YYYY-MM-DD` text.
- **API routes** under `src/app/api/`: exercises, workouts (with cursor pagination via `beforeId`), routines, stats, auth.
- **PWA:** `public/sw.js` (cache-first for static, network-first for nav, network-only for `/api/`), `public/manifest.json`.
- **Tailwind CSS v4** with `@tailwindcss/postcss` plugin, dark theme (`bg-zinc-950`).
- **ESLint 9 flat config** (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals` + `typescript`.
