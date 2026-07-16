-- Migration 0045: immutable mock-payment transaction metadata and receipts.
-- No card details are stored.

alter table public.job_subscriptions
  add column if not exists transaction_reference text,
  add column if not exists receipt_number text,
  add column if not exists amount_usd numeric(10, 2),
  add column if not exists currency text not null default 'USD',
  add column if not exists receipt_emailed_at timestamptz;

create unique index if not exists idx_job_subscriptions_transaction_reference
  on public.job_subscriptions (transaction_reference)
  where transaction_reference is not null;

create unique index if not exists idx_job_subscriptions_receipt_number
  on public.job_subscriptions (receipt_number)
  where receipt_number is not null;

create index if not exists idx_job_subscriptions_paid_at
  on public.job_subscriptions (paid_at desc);
