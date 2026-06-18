-- Migration 0016: Career advisory intake form submissions

create table public.career_advisory_intakes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  graduation_details text not null,
  branch text not null,
  is_veteran boolean not null default false,
  interested_technology text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_advisory_intakes_candidate_unique unique (candidate_id)
);

create index idx_career_advisory_intakes_candidate
  on public.career_advisory_intakes (candidate_id);

alter table public.career_advisory_intakes enable row level security;

create policy "career_advisory_intakes_select"
  on public.career_advisory_intakes for select
  using (candidate_id = auth.uid() or public.is_staff());

create policy "career_advisory_intakes_insert_own"
  on public.career_advisory_intakes for insert
  with check (candidate_id = auth.uid());

create policy "career_advisory_intakes_update_own"
  on public.career_advisory_intakes for update
  using (candidate_id = auth.uid())
  with check (candidate_id = auth.uid());
