-- Migration 0022: Candidate-facing application updates (JD + prep tips + read state)

alter table public.scraped_jobs
  add column if not exists preparation_tips text,
  add column if not exists candidate_viewed_at timestamptz;

create index if not exists idx_scraped_jobs_candidate_unread
  on public.scraped_jobs (candidate_id, applied, candidate_viewed_at)
  where applied = true;
