-- Migration 0007: Job Application Service + audit log
-- application_profile holds sensitive fields (veteran/disability/visa status).
-- These are application-layer encrypted before insert — Postgres stores
-- ciphertext in a `bytea`/`text` column; this migration models the column,
-- the encryption itself happens in the service layer (see services/).

create table public.job_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan text not null,
  start_date date not null default current_date,
  end_date date,
  recruiter_id uuid references public.users (id) on delete set null,
  status text not null default 'active'
);

create table public.application_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- Sensitive fields below are stored as encrypted text (ciphertext produced
  -- by the service layer, e.g. via pgsodium or app-level AES). Never insert
  -- plaintext into these columns directly.
  veteran_encrypted text,
  disability_encrypted text,
  visa_status_encrypted text,
  preferred_locations text[] not null default '{}',
  salary text,
  remote_pref text,
  unique (user_id)
);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.job_subscriptions (id) on delete cascade,
  company text not null,
  role text not null,
  job_url text,
  applied_at timestamptz,
  status application_status not null default 'queued',
  tailored_resume_url text,
  cover_letter_text text
);

create table public.cover_letter_templates (
  id uuid primary key default gen_random_uuid(),
  template_text text not null,
  embedding vector(1536),
  role_type text,
  seniority text
);

create table public.scraped_jobs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.users (id) on delete cascade,
  employee_id uuid not null references public.users (id) on delete set null,
  company text not null,
  role text not null,
  job_url text not null,
  jd_text text,
  relevance_score numeric(5, 2),
  selected boolean not null default false,
  scraped_at timestamptz not null default now()
);

create table public.recruiter_messages (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.users (id) on delete cascade,
  employee_id uuid not null references public.users (id) on delete cascade,
  message text not null,
  sent_at timestamptz not null default now(),
  sender_role text not null
);

-- Audit log: who viewed/changed what, when. Required per the plan's privacy
-- & compliance section. Written by the service layer (and via trigger for
-- direct profile reads where practical), never by client code.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users (id) on delete set null,
  action text not null,
  target text not null,
  timestamp timestamptz not null default now(),
  ip text
);

create index idx_job_applications_subscription on public.job_applications (subscription_id);
create index idx_scraped_jobs_candidate on public.scraped_jobs (candidate_id);
create index idx_scraped_jobs_employee on public.scraped_jobs (employee_id);
create index idx_recruiter_messages_candidate on public.recruiter_messages (candidate_id);
create index idx_audit_log_actor on public.audit_log (actor_user_id);
create index idx_audit_log_timestamp on public.audit_log (timestamp);
create index idx_cover_letter_templates_hnsw on public.cover_letter_templates
  using hnsw (embedding vector_cosine_ops);
