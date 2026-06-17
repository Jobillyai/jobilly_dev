-- Migration 0006: Mock Interviews — voice-based AI interviews with
-- self-improving question database via candidate feedback loop.

create table public.company_personas (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  interview_style text,
  focus_areas text[] not null default '{}',
  persona_prompt text not null
);

create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_personas (id) on delete cascade,
  role text not null,
  round_type text not null,
  question_text text not null,
  embedding vector(1536),
  source text not null default 'seeded', -- 'seeded' | 'candidate_feedback'
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.users (id) on delete cascade,
  company_id uuid not null references public.company_personas (id) on delete cascade,
  role text not null,
  round_type text not null,
  transcript_json jsonb not null default '[]', -- transcripts only, never raw audio
  scorecard_json jsonb,
  created_at timestamptz not null default now()
);

create table public.interview_feedback (
  id uuid primary key default gen_random_uuid(),
  mock_interview_id uuid not null references public.mock_interviews (id) on delete cascade,
  candidate_id uuid not null references public.users (id) on delete cascade,
  real_questions_json jsonb not null default '[]',
  pattern_notes text,
  difficulty text,
  outcome text,
  created_at timestamptz not null default now()
);

create index idx_interview_questions_company on public.interview_questions (company_id, role, round_type);
create index idx_interview_questions_hnsw on public.interview_questions
  using hnsw (embedding vector_cosine_ops);
create index idx_mock_interviews_candidate on public.mock_interviews (candidate_id);
