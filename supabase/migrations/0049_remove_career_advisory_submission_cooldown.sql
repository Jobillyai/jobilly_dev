-- Migration 0049: remove the candidate submission cooldown field.

alter table public.career_advisory_intakes
  drop column if exists candidate_submitted_at;
