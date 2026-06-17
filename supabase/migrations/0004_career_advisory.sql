-- Migration 0004: Career Advisory feature

create table public.advisory_sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.users (id) on delete cascade,
  mentor_id uuid not null references public.users (id) on delete cascade,
  scheduled_at timestamptz not null,
  status session_status not null default 'scheduled',
  meeting_url text,
  notes text,
  recommended_path_id uuid, -- FK added in 0005 after learning_paths exists
  created_at timestamptz not null default now()
);

create index idx_advisory_sessions_candidate on public.advisory_sessions (candidate_id);
create index idx_advisory_sessions_mentor on public.advisory_sessions (mentor_id);
create index idx_advisory_sessions_scheduled on public.advisory_sessions (scheduled_at);
