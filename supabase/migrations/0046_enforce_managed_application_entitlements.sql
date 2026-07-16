-- Migration 0046: enforce Managed Applications entitlements in database RLS.

create or replace function public.has_managed_applications_plan(target_candidate_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.job_subscriptions
    where user_id = target_candidate_id
      and status = 'active'
      and plan in ('job-applications', 'mock-and-job')
  );
$$;

drop policy if exists "scraped_jobs_select" on public.scraped_jobs;
create policy "scraped_jobs_select"
  on public.scraped_jobs for select
  using (
    (
      candidate_id = auth.uid()
      and applied = true
      and public.has_managed_applications_plan(candidate_id)
    )
    or (
      public.current_user_role() = 'admin'
      and public.has_managed_applications_plan(candidate_id)
      and (
        employee_id = auth.uid()
        or candidate_id in (
          select user_id
          from public.candidate_profiles
          where assigned_employee_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "job_subscriptions_select" on public.job_subscriptions;
create policy "job_subscriptions_select"
  on public.job_subscriptions for select
  using (
    user_id = auth.uid()
    or recruiter_id = auth.uid()
    or public.current_user_role() = 'admin'
    or public.is_manager()
  );
