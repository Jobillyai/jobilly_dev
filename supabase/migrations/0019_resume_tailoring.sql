-- Migration 0019: ATS resume score checks for candidate portal

create table public.resume_ats_checks (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.users (id) on delete cascade,
  target_role text not null,
  job_description text,
  resume_text text not null,
  resume_url text,
  ats_score integer,
  grade text,
  result_json jsonb not null default '{}'::jsonb,
  status text not null default 'completed'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_resume_ats_checks_candidate
  on public.resume_ats_checks (candidate_id, created_at desc);

alter table public.resume_ats_checks enable row level security;

create policy "resume_ats_checks_select"
  on public.resume_ats_checks for select
  using (candidate_id = auth.uid() or public.is_staff());

create policy "resume_ats_checks_insert_own"
  on public.resume_ats_checks for insert
  with check (candidate_id = auth.uid());

create policy "resume_ats_checks_update_own"
  on public.resume_ats_checks for update
  using (candidate_id = auth.uid())
  with check (candidate_id = auth.uid());

-- Private resume file storage (PDF, DOC, TXT)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy "resumes_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "resumes_select_own"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_staff()
    )
  );

create policy "resumes_update_own"
  on storage.objects for update
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "resumes_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
