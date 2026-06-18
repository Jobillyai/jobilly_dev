-- Migration 0017: Career advisory Google Meet invite fields

alter table public.career_advisory_intakes
  add column google_meet_link text,
  add column session_scheduled_at timestamptz,
  add column invite_sent_at timestamptz;
