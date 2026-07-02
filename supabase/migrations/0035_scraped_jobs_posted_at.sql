alter table public.scraped_jobs
  add column if not exists posted_at timestamptz;

comment on column public.scraped_jobs.posted_at is
  'When the job was posted on the source board (Indeed, LinkedIn, Google Jobs, etc.)';

create index if not exists idx_scraped_jobs_posted_at
  on public.scraped_jobs (candidate_id, posted_at desc nulls last);
