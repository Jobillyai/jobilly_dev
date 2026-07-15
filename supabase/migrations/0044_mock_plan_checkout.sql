-- Migration 0044: Canonical candidate plans and mock checkout billing details.
-- This intentionally stores no card data. Replace source='mock_checkout' with
-- provider references when real payments are introduced.

alter table public.job_subscriptions
  add column if not exists billing_name text,
  add column if not exists billing_email text,
  add column if not exists billing_phone text,
  add column if not exists billing_address_line1 text,
  add column if not exists billing_address_line2 text,
  add column if not exists billing_city text,
  add column if not exists billing_state text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_country text not null default 'United States',
  add column if not exists source text not null default 'mock_checkout',
  add column if not exists paid_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.job_subscriptions
  drop constraint if exists job_subscriptions_plan_check;

alter table public.job_subscriptions
  add constraint job_subscriptions_plan_check
  check (plan in ('mock-interviews', 'job-applications', 'mock-and-job'));

alter table public.job_subscriptions
  drop constraint if exists job_subscriptions_status_check;

alter table public.job_subscriptions
  add constraint job_subscriptions_status_check
  check (status in ('active', 'past_due', 'cancelled'));

create unique index if not exists idx_job_subscriptions_one_active_per_user
  on public.job_subscriptions (user_id)
  where status = 'active';

create index if not exists idx_job_subscriptions_user_status
  on public.job_subscriptions (user_id, status);

-- Subscription state is authoritative and can only be changed by trusted
-- server code using the service role. Candidates retain read access.
drop policy if exists "job_subscriptions_insert_own" on public.job_subscriptions;
