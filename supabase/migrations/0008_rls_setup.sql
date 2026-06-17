-- Migration 0008: Row-Level Security policies
-- Defence in depth: a candidate must never be able to read another
-- candidate's rows even if the application layer has a bug. Policies below
-- enforce that at the database level, independent of tRPC/app logic.

-- Helper: current user's role, looked up once per statement.
create function public.current_user_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- Helper: is the current user staff (employee or admin)?
create function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() in ('employee', 'admin');
$$;

alter table public.users enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.employee_profiles enable row level security;
alter table public.mentor_profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.institution_candidates enable row level security;
alter table public.advisory_sessions enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_embeddings enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.sandbox_challenges enable row level security;
alter table public.sandbox_submissions enable row level security;
alter table public.company_personas enable row level security;
alter table public.interview_questions enable row level security;
alter table public.mock_interviews enable row level security;
alter table public.interview_feedback enable row level security;
alter table public.job_subscriptions enable row level security;
alter table public.application_profile enable row level security;
alter table public.job_applications enable row level security;
alter table public.cover_letter_templates enable row level security;
alter table public.scraped_jobs enable row level security;
alter table public.recruiter_messages enable row level security;
alter table public.audit_log enable row level security;
