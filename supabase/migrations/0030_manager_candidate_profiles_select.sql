-- Migration 0030: Managers can read all candidate profiles (job role, years of experience)

drop policy if exists "candidate_profiles_select" on public.candidate_profiles;

create policy "candidate_profiles_select"
  on public.candidate_profiles for select
  using (
    user_id = auth.uid()
    or assigned_employee_id = auth.uid()
    or public.current_user_role() = 'admin'
    or public.is_manager()
  );
