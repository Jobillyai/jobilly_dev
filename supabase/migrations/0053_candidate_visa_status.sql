-- Visa / work authorization status for candidate profile and job applications.

alter table public.candidate_profiles
  add column if not exists visa_status text;

comment on column public.candidate_profiles.visa_status is
  'Candidate work authorization / visa status for US job applications.';
