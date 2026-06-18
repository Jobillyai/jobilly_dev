# Jobilly.ai

**From Graduation to First Job — Guided by AI.**

Jobilly.ai is a career platform for graduates and early-career candidates. It combines AI-guided learning, career advisory, mock interviews, and job application support in one place. This repository is the main web application: marketing site, candidate dashboard, career advisory intake, and an internal admin console.

## Features

### Candidate experience

- **Marketing home page** (`/`) — hero, stats, feature highlights, how-it-works, institutions section, and waitlist email capture
- **Auth** — signup, login, email confirmation, forgot/reset password
- **Candidate dashboard** (`/dashboard`) — welcome hub with links to platform features
- **Profile** (`/dashboard/profile`) — name, education, career goals, LinkedIn, resume upload
- **Career advisory** (`/dashboard/career-advisory`) — intake form (education, branch, technology interests, veteran status); sends a Google Meet invite email in local dev via Resend
- **Route loading** — top progress bar and overlay while navigating between pages

### Admin console

Protected routes under `/admin` for users with the `admin` role:

- **Dashboard** — stat cards, donut charts (candidate plans, advisory coverage, Meet invites, scraped jobs), quick actions, recent activity
- **Candidates** — browse candidates with profile and career advisory submission details
- **Job scraping** — per-candidate job search powered by the [Remotive API](https://remotive.com/remote-jobs/api), scored by branch/technology/education; Excel-style sheet to mark jobs for apply workflow
- **Jobs hub** (`/admin/jobs`) — overview of all scraped jobs across candidates
- **Tasks & calendar** — placeholder pages for upcoming workflow tooling
- **Admin profile** — admin account details

### UI polish

- Abstract background art on auth pages and marketing sections
- Glassmorphism admin sidebar
- Responsive layouts with CSS Modules alongside Tailwind

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router), TypeScript strict |
| Database & auth | Supabase (Postgres, Auth, Storage, RLS, pgvector) |
| API layer | tRPC + Zod + TanStack Query |
| Email | Resend (career advisory Meet invites) |
| Styling | Tailwind CSS, CSS Modules, shadcn/ui patterns |
| Testing | Vitest |
| CI | GitHub Actions (lint → typecheck → test → build) |

## Getting started

### Prerequisites

- **Node.js 20+**
- A [Supabase](https://supabase.com) project
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (standalone binary, not an npm package)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in at minimum:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin operations |
| `SUPABASE_PROJECT_ID` | Used by `db:generate-types` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

Optional for career advisory Meet invites (local dev only):

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender address |
| `CAREER_ADVISORY_GOOGLE_MEET_URL` | Meet link included in invite emails |
| `CAREER_ADVISORY_ORGANIZER_EMAIL` | Organizer email on calendar invites |

In production/staging, store secrets in Doppler or Infisical — do not commit real values to git.

### 3. Apply the database schema

Link the CLI to your project (one-time):

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Push migrations:

```bash
npm run db:migrate
```

Regenerate TypeScript types from the live schema:

```bash
npm run db:generate-types
```

For local Supabase with Docker:

```bash
supabase start
supabase db reset   # applies migrations + seed.sql
```

### 4. Configure Supabase Auth redirects

In the Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/auth/callback`

Add your production URL when deploying.

### 5. Create an admin user

After migrations and env setup:

```bash
node scripts/create-admin.mjs you@email.com "Your Name" your-password
```

This creates a Supabase Auth user and sets `role = admin` in `public.users`. Sign in at `/admin/login`.

### 6. Run the app

```bash
npm run dev
```

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Marketing home page |
| `http://localhost:3000/login` | Candidate login |
| `http://localhost:3000/dashboard` | Candidate dashboard |
| `http://localhost:3000/admin` | Admin console |

### 7. Quality gate (same as CI)

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Project structure

```
src/
  app/
    (auth)/              Login, signup, password reset
    admin/               Admin login + protected admin routes
    dashboard/           Candidate dashboard, profile, career advisory
    auth/callback/       Email confirmation handler
    api/trpc/            tRPC route handler
  components/
    admin/               Admin sidebar, charts, candidates list, job sheet
    auth/                Auth background and form layouts
    career-advisory/     Advisory intake form
    layout/              App shell, loaders, abstract background
    marketing/           Welcome page, navbar, feature cards
    profile/             Profile form
  lib/
    auth/                Session helpers, role checks
    trpc/                Client-side tRPC wiring
  server/
    actions/             Server Actions (auth, profile, admin, jobs)
    api/routers/         tRPC routers (thin, Zod-validated)
    db/                  Supabase clients + generated types
    services/            Business logic and database queries
supabase/
  migrations/            Ordered SQL: schema, RLS policies
  seed.sql               Local dev seed data
scripts/
  create-admin.mjs       Bootstrap an admin account
```

## User roles

Defined in `public.users.role`:

| Role | Access |
|------|--------|
| `free_candidate` | Standard candidate dashboard |
| `institution_candidate` | Institution-affiliated candidate |
| `subscribed_candidate` | Premium candidate |
| `admin` | Full admin console |
| `institution_admin` | Institution management (planned) |
| `employee` | Internal staff (planned) |

Middleware (`src/middleware.ts`) enforces route protection at the edge: `/dashboard` requires a session; `/admin` requires `admin` role.

## Architectural rules

- **Routers stay thin** — validate with Zod, delegate to `server/services/`
- **RLS is the security boundary** — every table needs Postgres policies before shipping
- **Never import `supabase-admin.ts` in client code** — it bypasses RLS
- **One migration per logical change** — never edit applied migrations; add a new file
- **AI/media integrations** belong in `server/services/`, not client components

## Database tables (high level)

| Area | Tables |
|------|--------|
| Identity | `users`, `password_reset_codes` |
| Career advisory | `career_advisory_intakes` |
| Jobs | `scraped_jobs`, `job_applications` |
| Learning | `growth_school_*` (schema ready, UI pending) |
| Interviews | `mock_interviews_*` (schema ready, UI pending) |
| Institutions | `institutions`, `institution_*` (schema ready, UI pending) |

## What's built vs planned

**Built**

- Auth flow, profile, career advisory intake + Meet invite emails (dev)
- Admin dashboard, candidates, job scraping (Remotive), pie charts
- Marketing welcome page, loading states, abstract backgrounds

**Planned (schema or stubs exist)**

- Growth School learning paths
- AI mock interviews (HeyGen, Deepgram, ElevenLabs)
- Stripe subscriptions
- Institution portals
- Full job application workflow (`job_applications`)
- Apify-based scraping (currently uses Remotive API)
- Tasks and calendar admin tools

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run db:migrate` | Push Supabase migrations |
| `npm run db:generate-types` | Regenerate `database.types.ts` |
| `npm run db:reset` | Reset local DB with seed |

## Known harmless build warning

`npm run build` may print an Edge Runtime warning from `@supabase/supabase-js` (`process.version`). This is an upstream Supabase issue and does not affect middleware at runtime.

## License

Private — Jobilly.ai. All rights reserved.
