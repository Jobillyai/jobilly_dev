-- Remove the JD-based AI resume-tailoring feature.
drop function if exists public.approve_resume_tailoring_run(uuid, uuid);
drop table if exists public.resume_tailoring_runs;
