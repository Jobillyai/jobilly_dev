-- Migration 0043: Candidate location + timezone for profile

alter table public.candidate_profiles
  add column if not exists location text,
  add column if not exists timezone text;

comment on column public.candidate_profiles.location is
  'Candidate residence / preferred location (self-reported).';

comment on column public.candidate_profiles.timezone is
  'IANA timezone derived from the candidate location (e.g. America/New_York).';
