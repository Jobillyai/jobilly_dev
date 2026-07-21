-- Add phone for staff/candidate contact on public.users
alter table public.users
  add column if not exists phone text;

comment on column public.users.phone is
  'Optional contact phone for staff and candidates.';
