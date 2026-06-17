-- Migration 0002: Core identity tables
-- users mirrors auth.users with app-specific fields (role, mfa flag).
-- A trigger keeps it in sync on signup.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  role user_role not null default 'free_candidate',
  mfa_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a `users` row whenever someone signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.candidate_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  education text,
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  career_goals text,
  resume_url text,
  linkedin_url text,
  subscription_status subscription_status not null default 'none',
  assigned_employee_id uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.employee_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  assigned_candidate_ids uuid[] not null default '{}'
    constraint max_three_candidates check (array_length(assigned_candidate_ids, 1) is null or array_length(assigned_candidate_ids, 1) <= 3),
  department text
);

create table public.mentor_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  specialisations text[] not null default '{}',
  availability_json jsonb not null default '{}',
  bio text,
  rating numeric(3, 2)
);

create index idx_candidate_profiles_employee on public.candidate_profiles (assigned_employee_id);
