-- Migration 0048: track candidate submissions independently from staff updates.

alter table public.career_advisory_intakes
  add column if not exists candidate_submitted_at timestamptz;

update public.career_advisory_intakes
set candidate_submitted_at = updated_at
where candidate_submitted_at is null;
