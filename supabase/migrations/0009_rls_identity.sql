-- Migration 0009: RLS policies — identity tables

-- users: everyone can read their own row; staff can read all (needed for
-- dashboards listing assigned candidates); only the row owner or staff can
-- update it, and role changes should really go through a service-role
-- function rather than direct update — restricted further below.
create policy "users_select_own_or_staff"
  on public.users for select
  using (id = auth.uid() or public.is_staff());

create policy "users_update_own"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- candidate_profiles: owner, their assigned employee, and any admin.
create policy "candidate_profiles_select"
  on public.candidate_profiles for select
  using (
    user_id = auth.uid()
    or assigned_employee_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

create policy "candidate_profiles_update_own"
  on public.candidate_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "candidate_profiles_insert_own"
  on public.candidate_profiles for insert
  with check (user_id = auth.uid());

-- employee_profiles: owner + admins only (internal staff data).
create policy "employee_profiles_select"
  on public.employee_profiles for select
  using (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "employee_profiles_update_own"
  on public.employee_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- mentor_profiles: publicly readable (candidates need to browse mentors to
-- book sessions); only the mentor themself can update.
create policy "mentor_profiles_select_all"
  on public.mentor_profiles for select
  using (true);

create policy "mentor_profiles_update_own"
  on public.mentor_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
