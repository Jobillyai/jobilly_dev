-- New candidate signups appear as service requests for managers to assign mentors.

alter table public.service_requests
  add column if not exists request_type text not null default 'contact'
    check (request_type in ('contact', 'new_candidate')),
  add column if not exists candidate_user_id uuid references public.users (id) on delete cascade;

create index if not exists idx_service_requests_candidate_user
  on public.service_requests (candidate_user_id, status, created_at desc);

create unique index if not exists idx_service_requests_open_new_candidate
  on public.service_requests (candidate_user_id)
  where request_type = 'new_candidate' and status in ('open', 'assigned');

comment on column public.service_requests.request_type is
  'contact = public form; new_candidate = signup alert for manager mentor assignment.';

comment on column public.service_requests.candidate_user_id is
  'Linked candidate user when request_type is new_candidate.';
