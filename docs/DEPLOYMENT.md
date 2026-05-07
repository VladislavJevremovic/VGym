# VGym Deployment Guide

## Overview

VGym is a Next.js 16 workout tracker PWA backed by Turso (serverless SQLite via libSQL + Drizzle ORM). Designed for Vercel deployment.

## Prerequisites

- Node.js 20+
- A [Turso](https://turso.tech) account
- A [Vercel](https://vercel.com) account (or any Node.js host)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TURSO_DB_URL` | Yes | Turso database URL (libsql://...) |
| `TURSO_AUTH_TOKEN` | Yes | Turso database auth token |
| `AUTH_SECRET` | Yes* | HMAC-SHA256 secret for auth cookies |

\* `AUTH_SECRET` throws in production if missing. In dev it defaults to `dev-secret-change-in-production`.

## 1. Create the Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.turso.tech | bash

# Login
turso auth login

# Create database
turso db create vgym

# Get the database URL
turso db show vgym --url

# Create an auth token
turso db tokens create vgym
```

Copy the URL and token — you'll need them for the next step.

## 2. Vercel Deployment

### Option A: Deploy via Vercel Dashboard

1. Push your repo to GitHub/GitLab/Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import the repository.
4. Add the three environment variables (`TURSO_DB_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`).
5. **Override build command** (leave default — `next build` is auto-detected).
6. Deploy.

### Option B: Deploy via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

Set the env vars when prompted, or add them in the Vercel dashboard under Project Settings → Environment Variables.

## 3. Initialize the Database

After deployment, run these commands **locally** (pointing at your Turso DB) to set up the schema and seed data:

```bash
# Set environment variables (use your Turso credentials)
export TURSO_DB_URL=libsql://...
export TURSO_AUTH_TOKEN=...

# Generate SQL migration
npm run db:generate

# Apply the migration to Turso
npm run db:migrate

# Seed 60 exercises + 4 routines
npm run db:seed
```

**Alternative:** You can also run these steps via a one-shot script:
```bash
npx drizzle-kit generate && npx drizzle-kit migrate && npx tsx src/drizzle/seed.ts
```

> **Note:** Drizzle Kit uses local env vars at runtime. These three scripts must run **after** `TURSO_DB_URL` and `TURSO_AUTH_TOKEN` are set. They can run from your dev machine (or a CI pipeline) — they connect directly to the remote Turso DB.

## 4. Post-Deployment

- Visit `https://your-app.vercel.app/setup` to set your PIN.
- The app will redirect all unauthenticated requests to `/setup`.
- The service worker registers automatically and caches shell routes (`/log`, `/routines`, `/history`, `/charts`).

## 5. Vercel Configuration (Optional)

The app works without a `vercel.json`, but add one for custom headers or rewrites:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

## 6. Updating After Schema Changes

1. Modify tables in `src/drizzle/schema.ts`.
2. Run `npm run db:generate` to create a new migration.
3. Run `npm run db:migrate` to apply it.
4. Redeploy (Vercel auto-deploys on push to the connected branch).

## Architecture Notes

- **All pages are `"use client"`** — pure client-side React with `fetch()` to the Next.js API routes.
- **Auth proxy** at `src/proxy.ts` — HMAC-SHA256 cookie `vgym_pin`, checked on every request except `/api/auth/*` and `/setup`.
- **Service worker** (`public/sw.js`) — cache-first for static assets, network-first for navigation, network-only for API. Has offline mutation queue via IndexedDB.
- **Rate limiting** — in-memory, per-Vercel-instance (not shared across regions). 10 auth attempts per 5 min per IP.
- **PWA** — installable with `manifest.json` and icons in `public/icons/`.
- **`@libsql/client`** is listed in `serverExternalPackages` in `next.config.ts` (required for serverless environments).
- **No Edge Runtime** — the proxy and all API routes use the Node.js runtime (required by `@libsql/client` and `bcryptjs`).

## Troubleshooting

| Symptom | Likely Cause |
|---|---|
| `AUTH_SECRET environment variable is required` | Missing `AUTH_SECRET` in Vercel env vars |
| 401 on API calls | Auth cookie missing or invalid — visit `/setup` |
| `TURSO_DB_URL` / `TURSO_AUTH_TOKEN` errors | Missing or incorrect Turso credentials |
| DB tables not found | Migrations not run — run `db:migrate` |
| Empty data | Seed not run — run `db:seed` |
| Service worker not registering | Non-HTTPS connection (PWA requires HTTPS) |
