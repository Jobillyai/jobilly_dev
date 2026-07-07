-- Migration 0041: Track candidate welcome email delivery

alter table public.candidate_profiles
  add column if not exists welcome_email_sent_at timestamptz;

comment on column public.candidate_profiles.welcome_email_sent_at is
  'When the post-signup welcome email was sent to the candidate.';
