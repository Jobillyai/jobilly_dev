-- Track daily application summary emails so cron does not resend the same day.

alter table public.candidate_profiles
  add column if not exists last_applications_digest_date date;

comment on column public.candidate_profiles.last_applications_digest_date is
  'Local calendar date (APPLICATIONS_DIGEST_TIMEZONE) of the last daily applied-jobs email sent.';
