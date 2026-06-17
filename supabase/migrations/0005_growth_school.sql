-- Migration 0005: Growth School — RAG-powered learning
-- OpenAI text-embedding-3-small produces 1536-dim vectors.

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.learning_modules (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths (id) on delete cascade,
  title text not null,
  position int not null default 0
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.learning_modules (id) on delete cascade,
  title text not null,
  video_url text,
  script_text text,
  position int not null default 0
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  watch_percent numeric(5, 2) not null default 0,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons (id) on delete cascade,
  questions_json jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.quiz_embeddings (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  embedding vector(1536) not null
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  answers_json jsonb not null default '{}',
  score numeric(5, 2),
  passed boolean,
  attempted_at timestamptz not null default now()
);

create table public.sandbox_challenges (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons (id) on delete cascade,
  problem_statement text not null,
  test_cases_json jsonb not null default '[]'
);

create table public.sandbox_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  challenge_id uuid not null references public.sandbox_challenges (id) on delete cascade,
  code text not null,
  result_json jsonb,
  passed boolean,
  submitted_at timestamptz not null default now()
);

-- Now that learning_paths exists, link advisory_sessions to it.
alter table public.advisory_sessions
  add constraint advisory_sessions_recommended_path_fkey
  foreign key (recommended_path_id) references public.learning_paths (id) on delete set null;

create index idx_lesson_progress_user on public.lesson_progress (user_id);
create index idx_quiz_attempts_user on public.quiz_attempts (user_id);
create index idx_sandbox_submissions_user on public.sandbox_submissions (user_id);

-- HNSW index for fast approximate nearest-neighbour search, per the
-- architecture plan's confirmed choice of pgvector over a separate vector DB.
create index idx_quiz_embeddings_hnsw on public.quiz_embeddings
  using hnsw (embedding vector_cosine_ops);
