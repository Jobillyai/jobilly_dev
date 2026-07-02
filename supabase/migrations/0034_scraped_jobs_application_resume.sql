alter table public.scraped_jobs
  add column if not exists application_resume_path text,
  add column if not exists application_resume_file_name text;

comment on column public.scraped_jobs.application_resume_path is
  'Private storage path (resumes bucket) for the resume used when applying to this job';
comment on column public.scraped_jobs.application_resume_file_name is
  'Original resume file name shown to the candidate';
