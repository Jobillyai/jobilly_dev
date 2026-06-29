-- Migration 0024: Manager role policies — centralized job scraping every 3 hours
-- Managers scrape jobs for all candidates; mentor admins (role admin) only
-- see candidates assigned via candidate_profiles.assigned_employee_id.

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() in ('employee', 'admin', 'manager');
$$;

create or replace function public.is_manager()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() = 'manager';
$$;

drop policy if exists "scraped_jobs_select" on public.scraped_jobs;
create policy "scraped_jobs_select"
  on public.scraped_jobs for select
  using (
    candidate_id = auth.uid()
    or employee_id = auth.uid()
    or public.is_manager()
    or (
      public.current_user_role() = 'admin'
      and candidate_id in (
        select user_id
        from public.candidate_profiles
        where assigned_employee_id = auth.uid()
      )
    )
  );

drop policy if exists "job_role_scrapes_select" on public.job_role_scrapes;
create policy "job_role_scrapes_select"
  on public.job_role_scrapes for select
  using (
    public.is_manager()
    or public.is_staff()
  );

create table if not exists public.job_scrape_runs (
  id uuid primary key default gen_random_uuid(),
  triggered_by uuid references public.users (id) on delete set null,
  trigger_type text not null check (trigger_type in ('cron', 'manual')),
  candidates_processed integer not null default 0,
  candidates_scraped integer not null default 0,
  new_jobs_added integer not null default 0,
  errors text[] not null default '{}',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_job_scrape_runs_started
  on public.job_scrape_runs (started_at desc);

alter table public.job_scrape_runs enable row level security;

create policy "job_scrape_runs_select_manager"
  on public.job_scrape_runs for select
  using (public.is_manager());

create policy "job_scrape_runs_write_manager"
  on public.job_scrape_runs for insert
  with check (public.is_manager());

create policy "job_scrape_runs_update_manager"
  on public.job_scrape_runs for update
  using (public.is_manager())
  with check (public.is_manager());
