-- Per-candidate extracted resume text for job match scoring (admin job sheet).

alter table public.candidate_profiles
  add column if not exists analyzed_resume_text text;

comment on column public.candidate_profiles.analyzed_resume_text is
  'Extracted resume text from the candidate''s uploaded resume, used for job match % in admin.';
