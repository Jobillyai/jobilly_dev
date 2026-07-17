-- Protected resume intelligence and strict occupational search metadata.
create table if not exists public.job_categories (
  id text primary key, label text not null,
  taxonomy_version text not null default '2026-07-v1',
  active boolean not null default true
);
insert into public.job_categories (id, label) values
 ('software_engineering','Software Engineering'),
 ('frontend_development','Frontend Development'),
 ('backend_development','Backend Development'),
 ('data_analysis','Data Analysis'),
 ('data_engineering','Data Engineering'),
 ('data_operations_technician','Data Operations / Data Technician'),
 ('data_center_technician','Data Center / IT Infrastructure Technician'),
 ('it_support','IT Support'),
 ('cloud_devops','Cloud / DevOps'),
 ('cybersecurity','Cybersecurity'),
 ('quality_assurance','Quality Assurance'),
 ('product_management','Product Management'),
 ('design_ux','Design / UX'),
 ('electrical_electronics_technician','Electrical / Electronics Technician'),
 ('mechanical_maintenance_technician','Mechanical / Maintenance Technician'),
 ('medical_laboratory_technician','Medical / Laboratory Technician'),
 ('other','Other / Needs Review')
on conflict (id) do update set label=excluded.label, active=true;

create table if not exists public.candidate_resume_sources (
 candidate_id uuid not null references public.users(id) on delete cascade,
 source_kind text not null check (source_kind in ('base_resume','admin_txt_override')),
 storage_path text not null, original_file_name text not null, canonical_mime text not null,
 byte_size integer not null check (byte_size>0), sha256 text not null,
 extracted_text text, parser_version text not null,
 extraction_status text not null check (extraction_status in ('pending','processing','completed','failed')),
 error_message text, uploaded_by uuid not null references public.users(id) on delete restrict,
 uploaded_at timestamptz not null default now(), extracted_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key(candidate_id,source_kind)
);
create table if not exists public.candidate_resume_analysis (
 candidate_id uuid primary key references public.users(id) on delete cascade,
 effective_source_kind text not null check (effective_source_kind in ('base_resume','admin_txt_override')),
 source_fingerprint text not null,
 status text not null check (status in ('pending','processing','completed','failed')),
 target_roles text[] not null default '{}', responsibilities text[] not null default '{}',
 skills text[] not null default '{}', search_keywords text[] not null default '{}',
 canonical_search_title text, category_id text references public.job_categories(id),
 confidence numeric(5,4), accepted_title_patterns text[] not null default '{}',
 excluded_category_ids text[] not null default '{}', result_json jsonb, model text,
 prompt_version text not null, taxonomy_version text not null, generation_token uuid not null,
 category_confirmed_at timestamptz, category_confirmed_by uuid references public.users(id) on delete set null,
 analyzed_at timestamptz, error_message text, updated_at timestamptz not null default now()
);
alter table public.candidate_resume_sources enable row level security;
alter table public.candidate_resume_analysis enable row level security;
alter table public.job_categories enable row level security;
create policy "job_categories_read" on public.job_categories for select using (auth.uid() is not null);
create policy "resume_sources_candidate_read" on public.candidate_resume_sources for select
 using(candidate_id=auth.uid());
create policy "resume_sources_assigned_admin_all" on public.candidate_resume_sources for all
 using(public.current_user_role()='admin' and candidate_id in
   (select user_id from public.candidate_profiles where assigned_employee_id=auth.uid()))
 with check(public.current_user_role()='admin' and candidate_id in
   (select user_id from public.candidate_profiles where assigned_employee_id=auth.uid()));
create policy "resume_analysis_candidate_read" on public.candidate_resume_analysis for select
 using(candidate_id=auth.uid());
create policy "resume_analysis_assigned_admin_all" on public.candidate_resume_analysis for all
 using(public.current_user_role()='admin' and candidate_id in
   (select user_id from public.candidate_profiles where assigned_employee_id=auth.uid()))
 with check(public.current_user_role()='admin' and candidate_id in
   (select user_id from public.candidate_profiles where assigned_employee_id=auth.uid()));

alter table public.scraped_jobs
 add column if not exists target_category text references public.job_categories(id),
 add column if not exists detected_category text references public.job_categories(id),
 add column if not exists category_confidence numeric(5,4),
 add column if not exists classifier_version text,
 add column if not exists intent_fingerprint text;
alter table public.job_role_scrapes
 add column if not exists target_category text references public.job_categories(id),
 add column if not exists classifier_version text,
 add column if not exists intent_fingerprint text not null default 'legacy';
alter table public.job_role_scrapes drop constraint if exists job_role_scrapes_pkey;
alter table public.job_role_scrapes add primary key(candidate_id,intent_fingerprint,source);
create index if not exists idx_scraped_jobs_strict_intent
 on public.scraped_jobs(candidate_id,intent_fingerprint,scraped_at desc);
create index if not exists idx_job_role_scrapes_strict_lookup
 on public.job_role_scrapes(candidate_id,intent_fingerprint,last_scraped_at desc);
