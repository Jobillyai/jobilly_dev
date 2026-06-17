-- Migration 0003: Partner institutions

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_colour text,
  subdomain text unique not null,
  subscription_plan text not null default 'standard',
  admin_user_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.institution_candidates (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (institution_id, user_id)
);

create index idx_institution_candidates_institution on public.institution_candidates (institution_id);
create index idx_institution_candidates_user on public.institution_candidates (user_id);
