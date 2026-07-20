-- Career advisory bookings appear as mentor service requests (not new signups).

alter table public.service_requests
  drop constraint if exists service_requests_request_type_check;

alter table public.service_requests
  add constraint service_requests_request_type_check
  check (request_type in ('contact', 'new_candidate', 'career_advisory'));

alter table public.service_requests
  add column if not exists session_scheduled_at timestamptz,
  add column if not exists meeting_remarks text,
  add column if not exists submitted_to_manager_at timestamptz;

create unique index if not exists idx_service_requests_open_career_advisory
  on public.service_requests (candidate_user_id)
  where request_type = 'career_advisory' and status in ('open', 'assigned');

comment on column public.service_requests.session_scheduled_at is
  'Booked career advisory session time when request_type is career_advisory.';

comment on column public.service_requests.meeting_remarks is
  'Mentor notes after the advisory session, sent to the manager on close.';
