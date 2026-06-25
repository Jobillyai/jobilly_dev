-- Migration 0021: Per-role job cache — store jobs by search role, scrape at most once per source per 24h

alter table public.scraped_jobs
  add column if not exists search_role text not null default 'general';

create index if not exists idx_scraped_jobs_candidate_role
  on public.scraped_jobs (candidate_id, search_role, scraped_at desc);

create unique index if not exists idx_scraped_jobs_unique_role_url
  on public.scraped_jobs (candidate_id, search_role, job_url);

create table if not exists public.job_role_scrapes (
  candidate_id uuid not null references public.users (id) on delete cascade,
  search_role text not null,
  source text not null,
  last_scraped_at timestamptz not null default now(),
  primary key (candidate_id, search_role, source)
);

create index if not exists idx_job_role_scrapes_lookup
  on public.job_role_scrapes (candidate_id, search_role, last_scraped_at desc);

alter table public.job_role_scrapes enable row level security;

create policy "job_role_scrapes_select"
  on public.job_role_scrapes for select
  using (
    public.current_user_role() = 'admin'
    or public.is_staff()
  );

create policy "job_role_scrapes_write_staff"
  on public.job_role_scrapes for all
  using (public.is_staff())
  with check (public.is_staff());
