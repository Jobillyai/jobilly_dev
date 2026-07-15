# Jobilly.AI

**From Graduation to First Job — Guided by AI.**

Jobilly.ai is a career platform for graduates and early-career candidates. It combines AI-guided learning, career advisory, mock interviews, and job application support in one place. This repository is the main web application: marketing site, candidate dashboard, career advisory intake, and an internal admin console.

## Features

### Candidate experience

- **Marketing home page** (`/`) — hero, stats, feature highlights, how-it-works, institutions section, and waitlist email capture
- **Auth** — signup, login, Google OAuth, email confirmation, forgot/reset password
- **Password reset** — branded reset emails sent via **Resend** (Supabase recovery link under the hood)
- **Rate limiting** — login and password-reset throttling via **Upstash Redis** (when configured)
- **Candidate dashboard** (`/dashboard`) — welcome hub with links to platform features
- **Matched roles** (`/dashboard/jobs`) — live list of jobs scraped for the candidate’s target role and years of experience; updates via Supabase Realtime (no aggressive polling)
- **Profile** (`/dashboard/profile`) — name, education, career goals, **years of experience**, LinkedIn, resume upload
- **Career advisory** (`/dashboard/career-advisory`) — intake form (education, branch, technology interests, veteran status); sends a Google Meet invite email in local dev via Resend
- **Member IDs** — candidates show `JAC####`, mentor admins `JAE####`, manager `JAM####` on login and in the portal
- **Route loading** — top progress bar and overlay while navigating between pages

### Admin console

Protected routes under `/admin` for staff roles (`admin` mentor, `manager`):

- **Top navbar** — staff name, member ID badge, log out (sticky on admin pages)
- **Staff profile** (`/admin/profile`) — employee ID only (no education/LinkedIn for staff)
- **Dashboard** — stat cards, charts, mentor activity overview (manager), quick actions
- **Candidates** — browse candidates with target role, years of experience, profile and advisory details
- **Job scraping** (`/admin/jobs`) — **manager-only** scrape controls:
  - Per-candidate **job role** and **years of experience** (editable before scrape)
  - Scrape one candidate, **scrape all (sequential)**, or quick bulk scrape
  - Overview table with target role and years exp. on file
- **Candidate job sheet** (`/admin/candidates/[id]/jobs`) — Excel-style sheet for Indeed, LinkedIn, and Google Jobs results; manager can set role + years and scrape; mentors review and mark shortlisted/applied
- **Background scrape UX** — stored jobs show immediately; new rows append as each source finishes (Indeed → LinkedIn → Google Jobs)
- **3-hour scrape cache** per candidate + role; Vercel cron refreshes all candidates every 3 hours
- **Tasks & calendar** — meeting tasks and calendar views
- **Admin login** (`/admin/login`) — separate from candidate login; member ID preview on email blur

### Job search sources

Jobs are scraped via **Apify** actors (not Remotive):

| Source | Actor |
|--------|--------|
| Indeed | `misceres/indeed-scraper` |
| LinkedIn | `curious_coder/linkedin-jobs-scraper` |
| Google Jobs | `automation-lab/google-jobs-scraper` |

Search uses the manager-set **job role** plus **years of experience** for better matching.

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router), TypeScript strict |
| Database & auth | Supabase (Postgres, Auth, Storage, RLS, Realtime, pgvector) |
| Job scraping | Apify API |
| Email | Resend (password reset, career advisory Meet invites) |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Hosting / cron | Vercel (`vercel.json` — scrape cron every 3 hours) |
| API layer | tRPC + Zod + TanStack Query |
| Styling | Tailwind CSS, CSS Modules, shadcn/ui patterns |
| Testing | Vitest |
| CI | GitHub Actions (lint → typecheck → test → build) |

## Getting started

### Prerequisites

- **Node.js 20+**
- A [Supabase](https://supabase.com) project
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (standalone binary, not an npm package)
- [Apify](https://apify.com) account and API token (for job scraping)
- [Resend](https://resend.com) account (for password reset and advisory emails)
- [Upstash Redis](https://upstash.com) (recommended for production login/reset rate limits)

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
| `APIFY_API_TOKEN` | Apify token for Indeed/LinkedIn/Google Jobs scraping |

Recommended for production:

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `Jobilly <noreply@yourdomain.com>` |
| `UPSTASH_REDIS_REST_URL` | Rate limiting for login and password reset |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token |
| `CRON_SECRET` | Bearer secret for `GET /api/cron/scrape-jobs` (Vercel cron) |

Optional for career advisory Meet invites (local dev):

| Variable | Purpose |
|----------|---------|
| `CAREER_ADVISORY_GOOGLE_MEET_URL` | Meet link included in invite emails |
| `CAREER_ADVISORY_ORGANIZER_EMAIL` | Organizer email on calendar invites |
| `IMPORT_DEFAULT_PASSWORD` | Default password when importing from spreadsheet (default `Jobilly2026!`) |

In production/staging, store secrets in Doppler or Infisical — do not commit real values to git.

### 3. Apply the database schema

Link the CLI to your project (one-time):

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Push migrations (includes manager role, member IDs, job search role, experience years, Realtime on `scraped_jobs`):

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

Disable Supabase’s default “Reset password” email template if you use Resend for resets (the app sends its own email with the same recovery link).

### 5. Bootstrap users

**Single admin (mentor):**

```bash
node scripts/create-admin.mjs you@email.com "Your Name" your-password
```

**Bulk import from spreadsheet** (managers, mentors, candidates from `data.xlsx`):

Expected columns: Candidate Name, Technology, Experience (years), Email, Mentor, mail ID, Manager, manager Mail ID.

```bash
node scripts/import-data-xlsx.mjs data.xlsx
```

Re-run import to refresh job roles and experience years on existing accounts.

### 6. Run the app

```bash
npm run dev
```

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Marketing home page |
| `http://localhost:3000/login` | Candidate login |
| `http://localhost:3000/dashboard` | Candidate dashboard |
| `http://localhost:3000/dashboard/jobs` | Matched roles (live updates) |
| `http://localhost:3000/admin/login` | Staff login (manager / mentor admin) |
| `http://localhost:3000/admin` | Admin console |
| `http://localhost:3000/admin/jobs` | Job scraping (manager) |

### 7. Quality gate (same as CI)

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## User roles

Defined in `public.users.role`:

| Role | Member ID prefix | Access |
|------|------------------|--------|
| `free_candidate` | `JAC` | Candidate dashboard, matched jobs, profile, advisory |
| `institution_candidate` | `JAC` | Institution-affiliated candidate |
| `subscribed_candidate` | `JAC` | Premium candidate |
| `admin` | `JAE` | Mentor admin — assigned candidates, job review, applications (no scrape) |
| `manager` | `JAM` | Full scrape for all candidates, team overview, job scraping UI |
| `institution_admin` | — | Institution management (planned) |
| `employee` | — | Internal staff (planned) |

Middleware (`src/middleware.ts`) enforces route protection: `/dashboard` requires a session; `/admin` requires manager or mentor admin role.

## Job scraping workflow

1. **Manager** sets each candidate’s **target role** and **years of experience** on `/admin/jobs` or the candidate job sheet.
2. Manager clicks **Scrape** (one candidate) or **Scrape all (sequential)**.
3. App scrapes **Indeed → LinkedIn → Google Jobs** per candidate, persisting after each source.
4. Results are cached **3 hours** per candidate + role; cron runs every **3 hours** on Vercel.
5. **Mentor admins** see stored jobs for assigned candidates and mark shortlisted/applied.
6. **Candidates** see matched roles on `/dashboard/jobs` (Realtime updates when new jobs are inserted).

## Project structure

```
src/
  app/
    (auth)/              Login, signup, forgot/reset password
    admin/               Admin login + protected admin routes
    dashboard/           Candidate dashboard, profile, jobs, career advisory
    auth/callback/       Email confirmation + password recovery handler
    api/cron/            Vercel cron — bulk job scrape
  components/
    admin/               Navbar, sidebar, manager scrape panel, job sheet, charts
    auth/                Auth forms, member ID badge, password fields
    dashboard/           Candidate matched jobs (Realtime)
  lib/
    auth/                Session, roles, member IDs
    hooks/               useScrapedJobsLiveUpdates (Supabase Realtime)
    rate-limit.ts        Upstash login/reset throttling
  server/
    actions/             Server Actions (auth, jobs, password reset)
    services/            Apify scraping, bulk scrape, Resend emails
supabase/migrations/     0023–0031: manager role, member IDs, job_search_role,
                         experience_years, RLS, Realtime on scraped_jobs
scripts/
  create-admin.mjs       Bootstrap one admin user
  import-data-xlsx.mjs   Import managers, mentors, candidates from spreadsheet
  diagnose-password-reset.mjs
vercel.json              Cron: scrape jobs every 3 hours
```

## Architectural rules

- **Routers stay thin** — validate with Zod, delegate to `server/services/`
- **RLS is the security boundary** — every table needs Postgres policies before shipping
- **Never import `supabase-admin.ts` in client code** — it bypasses RLS
- **One migration per logical change** — never edit applied migrations; add a new file
- **Manager scrape writes** may use service role; reads use RLS + admin client where needed

## Database tables (high level)

| Area | Tables |
|------|--------|
| Identity | `users` (member_id, first/last name), `candidate_profiles` (job_search_role, experience_years) |
| Career advisory | `career_advisory_intakes` |
| Jobs | `scraped_jobs`, `job_role_scrapes`, `job_scrape_runs` |
| Auth helpers | `password_reset_requests` (legacy OTP schema) |

## What's built vs planned

**Built**

- Manager + mentor admin roles, member IDs, admin navbar
- Apify job scraping (Indeed, LinkedIn, Google Jobs), 3h cache, Vercel cron
- Manager scrape UI with role + years of experience; candidate matched jobs page
- Supabase Realtime for live job lists (replaces 2.5s polling)
- Spreadsheet import for team + candidates
- Resend password reset emails; Upstash rate limits on auth
- Career advisory intake + Meet invite emails (dev)

**Planned**

- Growth School learning paths
- AI mock interviews (HeyGen, Deepgram, ElevenLabs)
- Stripe subscriptions
- Institution portals
- Queue-based background workers for large bulk scrapes (scale)
- Full job application workflow polish

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
| `node scripts/import-data-xlsx.mjs [file]` | Import team/candidates from Excel |
| `node scripts/create-admin.mjs email name password` | Create one admin user |

## Deploying on Vercel

1. Set all env vars from `.env.example` (especially `CRON_SECRET`, Apify, Resend, Upstash).
2. Add production URL to Supabase Auth redirect allowlist.
3. Verify sending domain at [resend.com/domains](https://resend.com/domains).
4. Cron is defined in `vercel.json` — requires Vercel plan that supports `maxDuration` (300s) on scrape routes.

## Known harmless build warning

`npm run build` may print an Edge Runtime warning from `@supabase/supabase-js` (`process.version`). This is an upstream Supabase issue and does not affect middleware at runtime.

## License

Private — Jobilly.ai. All rights reserved.
