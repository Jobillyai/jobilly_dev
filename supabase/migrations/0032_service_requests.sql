-- Migration 0032: Public contact / service requests with manager assignment to mentors

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  enquiry text not null,
  status text not null default 'open'
    check (status in ('open', 'assigned', 'closed')),
  assigned_mentor_id uuid references public.users (id) on delete set null,
  assigned_at timestamptz,
  assigned_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_service_requests_status_created
  on public.service_requests (status, created_at desc);

create index idx_service_requests_assigned_mentor
  on public.service_requests (assigned_mentor_id, status, created_at desc);

alter table public.service_requests enable row level security;

create policy "service_requests_select_manager"
  on public.service_requests for select
  using (public.is_manager());

create policy "service_requests_select_assigned_mentor"
  on public.service_requests for select
  using (
    public.current_user_role() = 'admin'
    and assigned_mentor_id = auth.uid()
  );

create policy "service_requests_update_manager"
  on public.service_requests for update
  using (public.is_manager())
  with check (public.is_manager());

create policy "service_requests_update_assigned_mentor"
  on public.service_requests for update
  using (
    public.current_user_role() = 'admin'
    and assigned_mentor_id = auth.uid()
  )
  with check (
    public.current_user_role() = 'admin'
    and assigned_mentor_id = auth.uid()
  );
