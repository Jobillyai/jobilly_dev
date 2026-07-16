-- Migration 0050: versioned, admin-reviewed JD resume tailoring runs.

create table if not exists public.resume_tailoring_runs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.users(id) on delete cascade,
  scraped_job_id uuid not null references public.scraped_jobs(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete restrict,
  status text not null default 'queued'
    check (status in ('queued', 'generating', 'review_required', 'approved', 'failed')),
  source_resume_path text not null,
  source_resume_file_name text not null,
  source_resume_sha256 text not null,
  job_description_snapshot text not null,
  model text,
  prompt_version text not null,
  result_json jsonb,
  ats_score integer check (ats_score between 0 and 100),
  generated_docx_path text,
  generated_pdf_path text,
  generated_docx_file_name text,
  generated_pdf_file_name text,
  error_message text,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resume_tailoring_runs_candidate
  on public.resume_tailoring_runs(candidate_id, created_at desc);

create index if not exists idx_resume_tailoring_runs_job
  on public.resume_tailoring_runs(scraped_job_id, created_at desc);

create unique index if not exists idx_resume_tailoring_runs_active
  on public.resume_tailoring_runs(candidate_id, scraped_job_id)
  where status in ('queued', 'generating');

alter table public.resume_tailoring_runs enable row level security;

drop policy if exists "resume_tailoring_runs_admin_select" on public.resume_tailoring_runs;
create policy "resume_tailoring_runs_admin_select"
  on public.resume_tailoring_runs for select
  using (
    public.current_user_role() = 'admin'
    and candidate_id in (
      select user_id
      from public.candidate_profiles
      where assigned_employee_id = auth.uid()
    )
  );

drop policy if exists "resume_tailoring_runs_admin_insert" on public.resume_tailoring_runs;
create policy "resume_tailoring_runs_admin_insert"
  on public.resume_tailoring_runs for insert
  with check (
    public.current_user_role() = 'admin'
    and created_by = auth.uid()
    and candidate_id in (
      select user_id
      from public.candidate_profiles
      where assigned_employee_id = auth.uid()
    )
  );

drop policy if exists "resume_tailoring_runs_admin_update" on public.resume_tailoring_runs;
create policy "resume_tailoring_runs_admin_update"
  on public.resume_tailoring_runs for update
  using (
    public.current_user_role() = 'admin'
    and candidate_id in (
      select user_id
      from public.candidate_profiles
      where assigned_employee_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() = 'admin'
    and candidate_id in (
      select user_id
      from public.candidate_profiles
      where assigned_employee_id = auth.uid()
    )
  );

create or replace function public.approve_resume_tailoring_run(
  p_run_id uuid,
  p_approved_by uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  tailoring_run public.resume_tailoring_runs%rowtype;
begin
  select * into tailoring_run
  from public.resume_tailoring_runs
  where id = p_run_id
  for update;

  if not found or tailoring_run.status <> 'review_required'
    or tailoring_run.generated_pdf_path is null then
    return false;
  end if;

  update public.scraped_jobs
  set
    application_resume_path = tailoring_run.generated_pdf_path,
    application_resume_file_name = tailoring_run.generated_pdf_file_name
  where id = tailoring_run.scraped_job_id
    and candidate_id = tailoring_run.candidate_id;

  if not found then
    return false;
  end if;

  update public.resume_tailoring_runs
  set
    status = 'approved',
    approved_by = p_approved_by,
    approved_at = now(),
    updated_at = now()
  where id = p_run_id;

  return true;
end;
$$;

revoke all on function public.approve_resume_tailoring_run(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_resume_tailoring_run(uuid, uuid)
  to service_role;
