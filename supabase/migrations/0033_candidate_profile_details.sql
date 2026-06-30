-- Migration 0033: Extended candidate profile fields for portal + admin visibility

alter table public.candidate_profiles
  add column if not exists gender text,
  add column if not exists graduation_college text,
  add column if not exists graduation_year smallint,
  add column if not exists specialization text,
  add column if not exists work_experience text;

alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_graduation_year_check;

alter table public.candidate_profiles
  add constraint candidate_profiles_graduation_year_check
  check (
    graduation_year is null
    or (graduation_year >= 1950 and graduation_year <= extract(year from now())::smallint + 1)
  );

comment on column public.candidate_profiles.gender is
  'Candidate gender (self-reported).';

comment on column public.candidate_profiles.graduation_college is
  'College or university where the candidate graduated.';

comment on column public.candidate_profiles.graduation_year is
  'Year the candidate graduated.';

comment on column public.candidate_profiles.specialization is
  'Major, branch, or area of specialization.';

comment on column public.candidate_profiles.work_experience is
  'Free-text summary of prior work experience.';
