-- Migration 0013: RLS policies — Job Application Service + audit log
-- application_profile holds veteran/disability/visa status (encrypted at
-- the column level by the service layer). Per the plan: "visible only to
-- the assigned recruiter." We enforce that the row is only selectable by
-- its owner or the specific employee assigned to that candidate — not staff
-- in general.

create policy "job_subscriptions_select"
  on public.job_subscriptions for select
  using (user_id = auth.uid() or recruiter_id = auth.uid() or public.current_user_role() = 'admin');

create policy "job_subscriptions_insert_own"
  on public.job_subscriptions for insert
  with check (user_id = auth.uid());

create policy "application_profile_select_owner_or_assigned_recruiter"
  on public.application_profile for select
  using (
    user_id = auth.uid()
    or public.current_user_role() = 'admin'
    or auth.uid() in (
      select assigned_employee_id from public.candidate_profiles
      where candidate_profiles.user_id = application_profile.user_id
    )
  );

create policy "application_profile_insert_own"
  on public.application_profile for insert
  with check (user_id = auth.uid());

create policy "application_profile_update_owner_or_assigned_recruiter"
  on public.application_profile for update
  using (
    user_id = auth.uid()
    or auth.uid() in (
      select assigned_employee_id from public.candidate_profiles
      where candidate_profiles.user_id = application_profile.user_id
    )
  );

create policy "job_applications_select"
  on public.job_applications for select
  using (
    subscription_id in (
      select id from public.job_subscriptions
      where user_id = auth.uid() or recruiter_id = auth.uid()
    )
    or public.current_user_role() = 'admin'
  );

create policy "job_applications_write_staff"
  on public.job_applications for insert
  with check (public.is_staff());

create policy "job_applications_update_staff"
  on public.job_applications for update
  using (public.is_staff())
  with check (public.is_staff());

create policy "cover_letter_templates_select_all" on public.cover_letter_templates for select using (true);
create policy "cover_letter_templates_write_staff" on public.cover_letter_templates for all
  using (public.is_staff()) with check (public.is_staff());

create policy "scraped_jobs_select"
  on public.scraped_jobs for select
  using (candidate_id = auth.uid() or employee_id = auth.uid() or public.current_user_role() = 'admin');

create policy "scraped_jobs_write_staff"
  on public.scraped_jobs for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "recruiter_messages_select"
  on public.recruiter_messages for select
  using (candidate_id = auth.uid() or employee_id = auth.uid() or public.current_user_role() = 'admin');

create policy "recruiter_messages_insert"
  on public.recruiter_messages for insert
  with check (candidate_id = auth.uid() or employee_id = auth.uid());

-- Audit log: write-only for normal users (nobody should be able to read or
-- tamper with it via the app); only admins can read it. Inserts happen via
-- the service-role client from server-side service functions, not directly
-- from authenticated user sessions — but the insert policy is included for
-- completeness/defence in depth.
create policy "audit_log_select_admin_only"
  on public.audit_log for select
  using (public.current_user_role() = 'admin');

create policy "audit_log_insert_staff"
  on public.audit_log for insert
  with check (public.is_staff());
