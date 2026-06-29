-- Migration 0028: Candidate work experience for job matching and scraping

alter table public.candidate_profiles
  add column if not exists experience text;

comment on column public.candidate_profiles.experience is
  'Work experience, internships, and projects — used for job matching and scrape relevance.';
