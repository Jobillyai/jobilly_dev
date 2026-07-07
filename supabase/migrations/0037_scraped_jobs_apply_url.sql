alter table public.scraped_jobs
  add column if not exists apply_url text;

comment on column public.scraped_jobs.apply_url is
  'External company apply URL from LinkedIn (when Apply redirects off-site). job_url remains the LinkedIn listing URL.';
