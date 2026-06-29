-- Migration 0027: Manager-set job search role per candidate
-- Used for bulk and per-candidate job scraping from the manager portal.

alter table public.candidate_profiles
  add column if not exists job_search_role text;

comment on column public.candidate_profiles.job_search_role is
  'Target job title/role set by the manager for scraping (overrides advisory defaults).';
