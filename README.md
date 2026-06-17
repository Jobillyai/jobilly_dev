# Jobilly.ai

From Graduation to First Job — Guided by AI.

This repo is the **Phase 0** scaffold from the Technical Architecture & Development Plan (v4.0): repo structure, CI, Next.js skeleton, full Supabase schema with Row-Level Security, and the tRPC service-layer boundary. Feature dashboards (Phase 1+) build on top of this.

## Stack

Next.js 14 (App Router) + TypeScript strict · Supabase (Postgres + pgvector + Auth + Storage + RLS) · tRPC + Zod · TanStack Query · Tailwind + shadcn/ui patterns.

## Getting started

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine to start)
- The [Supabase CLI](https://supabase.com/docs/guides/cli), installed as a **standalone binary** (not an npm dependency — see install instructions for your OS, e.g. Homebrew on macOS or the install script on Linux)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project's API settings (Project Settings → API). Leave the AI/media/infra keys blank for now — they're only needed starting Phase 2+.

In production/staging, **do not** use `.env` files for real secrets — store them in Doppler or Infisical and inject at deploy time, per the architecture plan's secrets-management decision.

### 4. Apply the database schema

Link the CLI to your project (one-time):

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Push the migrations in `supabase/migrations/` (extensions, enums, all tables, and every RLS policy):

```bash
npm run db:migrate
```

Then generate TypeScript types from the live schema, replacing the placeholder in `src/server/db/database.types.ts`:

```bash
npm run db:generate-types
```

For **local development** instead of a hosted project, you can run Supabase locally with Docker:

```bash
supabase start    # spins up local Postgres + Auth + Studio
supabase db reset # applies migrations + seed.sql
```

### 5. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`.

### 6. Verify the quality gate locally

This is the same check GitHub Actions runs on every push/PR:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Project structure

```
src/
  app/                  Next.js App Router pages + the tRPC route handler
  server/
    api/
      routers/           tRPC routers — thin, Zod-validated, delegate to services
      root.ts             combines all routers into the app router
      trpc.ts             context, base procedures, auth/role middleware
    db/                  Supabase clients (browser / server / admin) + generated types
    services/            business logic — the only code that queries tables directly
  components/ui/        shared UI primitives (shadcn/ui pattern)
  lib/trpc/             client-side tRPC + React Query wiring
supabase/
  migrations/           ordered SQL migrations: schema, then RLS policies
  seed.sql              local dev seed data
  config.toml           local Supabase CLI config
.github/workflows/ci.yml  lint -> typecheck -> test -> build gate
```

## Architectural rules to keep as the codebase grows

- **Routers stay thin.** A router validates input with Zod and calls a service function. It never calls `.from("table")` directly — see `candidate.ts` / `candidate-service.ts` for the reference pattern.
- **RLS is the real security boundary**, not the app layer. `protectedProcedure` and `roleProtectedProcedure` are convenience checks for better error messages and to avoid unnecessary queries — they are not a substitute for the Postgres policies in `supabase/migrations/0009`–`0013`. Every new table needs RLS enabled and explicit policies before it ships.
- **Never import `supabase-admin.ts` into client code.** It holds the service-role key and bypasses RLS entirely; it's guarded with `server-only` so any accidental client import fails the build, but don't rely on that as your only check.
- **One migration file per logical change**, applied in order. Don't edit a migration that's already been applied to a shared environment — write a new one.
- **New AI/media integrations** (HeyGen, Deepgram, ElevenLabs, Apify, etc.) belong in `server/services/`, called from a router or a background worker — never called directly from a client component.

## Auth flow (signup, login, logout)

Built on Supabase Auth, using Next.js Server Actions rather than client-side API calls — this keeps the actual auth calls server-side and works with the cookie-based session the rest of the app relies on.

- `/signup` and `/login` — forms backed by server actions in `src/server/actions/auth.ts`. Both validate input with Zod before touching Supabase.
- `/confirm` — shown after signup, telling the person to check their email (Supabase requires email confirmation by default on hosted projects).
- `/auth/callback` — a route handler that exchanges the one-time code from the confirmation email link for a real session, then redirects to `/dashboard`.
- `/dashboard` — a minimal protected page; redirects to `/login` if there's no session. This is where Phase 1 feature dashboards will eventually live.
- Middleware (`src/middleware.ts`) enforces the same protection at the edge: visiting `/dashboard` while logged out redirects to `/login`; visiting `/login` or `/signup` while already logged in redirects to `/dashboard`.

**Before testing signup locally**, set your Supabase project's redirect URLs: in the Supabase dashboard, go to Authentication → URL Configuration, and set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` as an allowed redirect URL. Without this, the confirmation email link won't route back to your app correctly. When you deploy, add your production URL there too.

A note on the implementation: this project pins React 18 (required by the current tRPC v10 + TanStack Query v4 pairing), so the auth forms use `useState` + `useTransition` rather than React 19's `useActionState`/`useFormState` — those hooks aren't available on this React version. The pattern is Next.js's documented "custom invocation using startTransition," not a workaround.

## What's intentionally not in this scaffold yet

Per the agreed Phase 0 scope, this does not include: feature dashboards (Phase 1), Cloudflare/Vercel/Railway provisioning (requires your accounts), Sentry/Axiom/Upstash wiring, Stripe, or any of the AI service integrations. Those land in later phases per the plan's 18-week schedule.

## Known harmless build warning

`npm run build` prints a warning like `A Node.js API is used (process.version at line: ...) which is not supported in the Edge Runtime`, pointing at `@supabase/supabase-js`. This is an upstream Supabase bug (a Node deprecation-check that Next.js's bundler flags even though it's guarded and never runs in the Edge Runtime) — not something wrong in this codebase, and not something that affects middleware at runtime. Safe to ignore; it'll likely disappear in a future Supabase release.
