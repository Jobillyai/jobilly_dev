-- Migration 0020: Job apply workflow — candidates see only applied scraped jobs

alter table public.scraped_jobs
  add column if not exists applied boolean not null default false,
  add column if not exists applied_at timestamptz,
  add column if not exists location text,
  add column if not exists source text not null default 'Apify';

create index if not exists idx_scraped_jobs_candidate_applied
  on public.scraped_jobs (candidate_id, applied, scraped_at desc);

drop policy if exists "scraped_jobs_select" on public.scraped_jobs;

create policy "scraped_jobs_select"
  on public.scraped_jobs for select
  using (
    public.current_user_role() = 'admin'
    or public.is_staff()
    or (candidate_id = auth.uid() and applied = true)
  );
