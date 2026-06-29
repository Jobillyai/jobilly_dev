-- Migration 0029: Experience as years (from data.xlsx), not free-text

alter table public.candidate_profiles
  drop column if exists experience;

alter table public.candidate_profiles
  add column if not exists experience_years smallint
  check (
    experience_years is null
    or (experience_years >= 0 and experience_years <= 50)
  );

comment on column public.candidate_profiles.experience_years is
  'Years of professional experience (matches Experience column in import spreadsheet).';

-- Backfill from education when import stored years there as plain numbers
update public.candidate_profiles
set experience_years = education::smallint
where experience_years is null
  and education ~ '^\s*[0-9]+\s*$';
