-- Migration 0042: Mentor daily task updates for managers

create table public.admin_daily_updates (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.users (id) on delete cascade,
  work_date date not null,
  remarks text not null default '',
  activity_snapshot jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

create index idx_admin_daily_updates_work_date
  on public.admin_daily_updates (work_date desc);

create index idx_admin_daily_updates_employee_date
  on public.admin_daily_updates (employee_id, work_date desc);

alter table public.admin_daily_updates enable row level security;

create policy "admin_daily_updates_select"
  on public.admin_daily_updates for select
  using (
    employee_id = auth.uid()
    or public.is_manager()
  );

create policy "admin_daily_updates_insert_mentor"
  on public.admin_daily_updates for insert
  with check (
    employee_id = auth.uid()
    and public.current_user_role() = 'admin'
  );

create policy "admin_daily_updates_update_mentor"
  on public.admin_daily_updates for update
  using (
    employee_id = auth.uid()
    and public.current_user_role() = 'admin'
  )
  with check (
    employee_id = auth.uid()
    and public.current_user_role() = 'admin'
  );
